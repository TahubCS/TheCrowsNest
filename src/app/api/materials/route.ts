/**
 * GET  /api/materials?classId=...  — fetch materials for a class
 * POST /api/materials              — save metadata after S3 upload
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createMaterial, getMaterialsByClassId, updateMaterialStatus, deleteMaterial } from "@/lib/db";
import type { ApiResponse } from "@/types";

const MATERIAL_TYPES = ["Syllabus", "Lecture Slides", "Study Guide", "Past Exam", "Notes", "Other"];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const classId = request.nextUrl.searchParams.get("classId");
    if (!classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId is required." },
        { status: 400 }
      );
    }

    const materials = await getMaterialsByClassId(classId);
    // Sort newest first
    materials.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "OK",
      data: { materials },
    });
  } catch (error) {
    console.error("[Materials GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { materialId, classId, fileName, fileType, s3Key, materialType } = await request.json();

    if (!materialId || !classId || !fileName || !fileType || !s3Key || !materialType) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    if (!MATERIAL_TYPES.includes(materialType)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Invalid material type." },
        { status: 400 }
      );
    }

    await createMaterial({
      materialId,
      classId,
      fileName,
      fileType,
      s3Key,
      materialType,
      uploadedBy: session.user.email,
      uploadedByName: session.user.name,
      status: "PENDING_REVIEW",
      uploadedAt: new Date().toISOString(),
    });

    // File sits in S3 waiting for admin review — no auto-processing
    return NextResponse.json<ApiResponse>(
      { success: true, message: "Material uploaded. Awaiting admin review.", data: { materialId } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Materials POST Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}

async function processMaterial(classId: string, materialId: string, s3Key: string, fileName: string) {
  try {
    const res = await fetch("http://localhost:8000/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, materialId, s3Key, fileName }),
    });

    if (!res.ok) {
      throw new Error(`Python Backend Error: ${res.statusText}`);
    }
    
    // Mark as PROCESSED in the database so UI updates
    await updateMaterialStatus(classId, materialId, "PROCESSED");
  } catch (err) {
    console.error("[Python Sync Error] Failed to process material.", err);
    await updateMaterialStatus(classId, materialId, "FAILED");
    throw err;
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const materialId = request.nextUrl.searchParams.get("materialId");
    const classId = request.nextUrl.searchParams.get("classId");
    const s3Key = request.nextUrl.searchParams.get("s3Key");

    if (!materialId || !classId || !s3Key) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Missing required parameters." },
        { status: 400 }
      );
    }

    // Step 1: Delete from S3
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        ...(process.env.AWS_SESSION_TOKEN && {
          sessionToken: process.env.AWS_SESSION_TOKEN,
        }),
      },
    });

    await s3.send(
      new DeleteObjectCommand({
        Bucket: "thecrowsnest",
        Key: s3Key,
      })
    );

    // Step 2: Delete from DB
    await deleteMaterial(classId, materialId);

    // Step 3: Delete Vectors from PostgreSQL
    try {
      await fetch(`http://localhost:8000/materials/${materialId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("[Python Sync Error] Failed to delete vectors from PostgreSQL.", err);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Material deleted successfully",
    });
  } catch (error) {
    console.error("[Materials DELETE Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to delete material." },
      { status: 500 }
    );
  }
}
