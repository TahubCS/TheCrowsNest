/**
 * GET  /api/materials?classId=...  — fetch materials for a class
 * POST /api/materials              — save metadata after Supabase Storage upload
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createMaterial, getMaterialsByClassId, getMaterialsByUserEmail, updateMaterialStatus, deleteMaterial } from "@/lib/db";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import type { ApiResponse, Material } from "@/types";

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
    let allMaterials: Material[] = [];

    if (classId) {
      allMaterials = await getMaterialsByClassId(classId);
    } else {
      allMaterials = await getMaterialsByUserEmail(session.user.email);
    }

    // Filter out materials that have passed their manual TTL expiration
    const now = Math.floor(Date.now() / 1000);
    const materials = allMaterials.filter(m => !m.expiresAt || m.expiresAt > now);

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

    // -------------------------------------------------------------
    // AI EVALUATION LOGIC
    // -------------------------------------------------------------
    try {
      const { getClassesByIds, updateMaterialWithRejection } = await import("@/lib/db");
      const classes = await getClassesByIds([classId]);
      const classData = classes.length > 0 ? classes[0] : null;

      if (classData) {
        const classContext = `
Course Code: ${classData.courseCode}
Course Name: ${classData.courseName}
Department: ${classData.department || 'Unknown'}
Description: ${classData.description || 'No description available.'}

Syllabus / Official Course Details:
${classData.syllabus || 'No syllabus provided.'}
`.trim();

        const res = await fetch("http://localhost:8000/evaluate-and-ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, materialId, s3Key, fileName, classContext }),
        });

        if (res.ok) {
          const pyData = await res.json();
          const evaluation = pyData.data?.evaluation;
          const reason = pyData.data?.reason || "Unknown";

          if (evaluation === "APPROVED") {
            await updateMaterialStatus(classId, materialId, "PROCESSED");
            return NextResponse.json<ApiResponse>(
              { success: true, message: "Material autonomously processed and approved by AI! 🥳", data: { materialId } },
              { status: 201 }
            );
          } else if (evaluation === "REJECTED") {
            // Delete from Supabase Storage and mark rejected with 7-day TTL
            await supabase.storage.from(STORAGE_BUCKET).remove([s3Key]);

            const sevenDaysFromNow = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
            await updateMaterialWithRejection(classId, materialId, "REJECTED", `AI Auto-Rejection: ${reason}`, sevenDaysFromNow);

            return NextResponse.json<ApiResponse>(
              { success: false, message: `Material rejected by AI (Mismatch with syllabus). Reason: ${reason}` },
              { status: 406 }
            );
          } else if (evaluation === "PENDING") {
            const confidence = pyData.data?.confidence;
            return NextResponse.json<ApiResponse>(
              { success: true, message: `Material uploaded securely. AI confidence was ${confidence}%, so it was marked for Admin Review to be safe.`, data: { materialId } },
              { status: 201 }
            );
          }
        } else {
          console.error("Python AI Evaluation returned non-ok status:", res.statusText);
        }
      }
    } catch (evalError) {
      console.error("[AI Evaluation Error]", evalError);
      // Failsafe: If evaluation crashes, allow the material to remain in PENDING_REVIEW
    }
    // -------------------------------------------------------------

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

    const { getMaterial } = await import("@/lib/db");
    const material = await getMaterial(classId, materialId);

    if (!material) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Material not found." },
        { status: 404 }
      );
    }

    const adminEmails = process.env.ADMIN_EMAILS || "";
    const isAdmin = adminEmails.split(",").map(e => e.trim().toLowerCase()).includes(session.user.email.toLowerCase());

    if (material.uploadedBy !== session.user.email && !isAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "You are not authorized to delete this material." },
        { status: 403 }
      );
    }

    // Step 1: Delete from Supabase Storage
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([s3Key]);
    if (storageError) {
      console.error("[Storage Delete Error]", storageError);
    }

    // Step 2: Delete from DB
    await deleteMaterial(classId, materialId);

    // Step 3: Delete vectors from PostgreSQL via Python backend
    try {
      await fetch(`http://localhost:8000/materials/${materialId}`, { method: "DELETE" });
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
