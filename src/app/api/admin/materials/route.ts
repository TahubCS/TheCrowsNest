/**
 * GET   /api/admin/materials        — Get all PENDING_REVIEW materials (admin only)
 * PATCH /api/admin/materials        — Approve or reject a material
 *
 * On approve: triggers Python backend processing, then marks PROCESSED.
 * On reject:  marks REJECTED with optional reason.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllPendingMaterials, updateMaterialStatus, updateMaterialWithRejection } from "@/lib/db";
import type { ApiResponse } from "@/types";

function isAdmin(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS || "";
  const emailsList = adminEmails.split(",").map((e) => e.trim().toLowerCase());
  return emailsList.includes(email.toLowerCase());
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const materials = await getAllPendingMaterials();

    // Sort newest first
    materials.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Fetched pending materials",
      data: materials,
    });
  } catch (error) {
    console.error("[Admin Materials GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to fetch materials" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { classId, materialId, s3Key, fileName, action, rejectionReason } = await request.json();

    if (!classId || !materialId || !action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId, materialId, and valid action (APPROVE/REJECT) are required" },
        { status: 400 }
      );
    }

    if (action === "REJECT") {
      // Delete file from S3
      if (s3Key) {
        try {
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
          await s3.send(new DeleteObjectCommand({ Bucket: "thecrowsnest", Key: s3Key }));
        } catch (s3Err) {
          console.error("[S3 Delete Error on Reject]", s3Err);
          // Continue with DB cleanup even if S3 delete fails
        }
      }

      // Remove the material record from DynamoDB
      const { deleteMaterial } = await import("@/lib/db");
      await deleteMaterial(classId, materialId);

      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Material rejected and removed",
      });
    }

    // APPROVE flow: mark as PROCESSING, trigger Python backend, then PROCESSED
    if (!s3Key || !fileName) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "s3Key and fileName are required for approval" },
        { status: 400 }
      );
    }

    await updateMaterialStatus(classId, materialId, "PROCESSING");

    // Trigger Python backend processing
    try {
      const res = await fetch("http://localhost:8000/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, materialId, s3Key, fileName }),
      });

      if (!res.ok) {
        throw new Error(`Python Backend Error: ${res.statusText}`);
      }

      // Mark as PROCESSED after successful ingestion
      await updateMaterialStatus(classId, materialId, "PROCESSED");

      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Material approved and processed successfully",
      });
    } catch (err) {
      console.error("[Python Processing Error]", err);
      await updateMaterialStatus(classId, materialId, "FAILED");
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Material approved but processing failed. Check Python backend." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Admin Materials PATCH Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to update material" },
      { status: 500 }
    );
  }
}
