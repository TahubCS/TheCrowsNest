/**
 * GET  /api/materials?classId=...  — fetch materials for a class
 * POST /api/materials              — save metadata after Supabase Storage upload (non-blocking)
 */

import { NextRequest, NextResponse } from "next/server";
import { aiBackendUrl } from "@/lib/ai-backend";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
  createMaterial,
  getMaterialsByClassId,
  getMaterialsByUserEmail,
  logMaterialUploadEvent,
  deleteMaterial,
  countRecentUploads,
  countRecentRejections,
  findDuplicateByHash,
  logActivityEvent,
} from "@/lib/db";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import {
  UPLOAD_THRESHOLDS,
  REASON_MESSAGES,
  type ReasonCode,
} from "@/lib/upload-safety";
import type { ApiResponse, Material } from "@/types";

const MATERIAL_TYPES = ["Syllabus", "Lecture Slides", "Study Guide", "Past Exam", "Notes", "Other"];

// ============================================================
// GET — list materials
// ============================================================

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

    if (classId) {
      materials.sort((a, b) => {
        const popularityDiff = (b.popularityRating ?? 0) - (a.popularityRating ?? 0);
        if (popularityDiff !== 0) return popularityDiff;
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      });
    } else {
      materials.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    }

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

// ============================================================
// POST — save metadata + fire off AI evaluation (non-blocking)
// ============================================================

async function rejectResponse(reasonCode: ReasonCode, storageKey?: string, status = 400) {
  if (storageKey) {
    try {
      await supabase.storage.from(STORAGE_BUCKET).remove([storageKey]);
    } catch (err) {
      console.error("[Storage Cleanup Error on Rejection]", err);
    }
  }
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      message: REASON_MESSAGES[reasonCode],
      data: { reasonCode },
    },
    { status }
  );
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

    const {
      materialId, classId, fileName, fileType, storageKey, materialType,
      fileSize, fileExtension, contentHash,
    } = await request.json();

    if (!materialId || !classId || !fileName || !fileType || !storageKey || !materialType) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    if (!MATERIAL_TYPES.includes(materialType)) {
      return rejectResponse("unsupported_type", storageKey, 400);
    }

    // AB-001: Rate limit check
    const recentCount = await countRecentUploads(
      session.user.email,
      UPLOAD_THRESHOLDS.rateLimitWindowMinutes
    );
    if (recentCount >= UPLOAD_THRESHOLDS.rateLimitUploads) {
      return rejectResponse("rate_limited", storageKey, 429);
    }

    // AB-002: Repeated rejection pattern
    const recentRejections = await countRecentRejections(
      session.user.email,
      UPLOAD_THRESHOLDS.rateLimitWindowMinutes
    );
    const forceReview = recentRejections >= 3;

    // UP-006: Duplicate content hash suppression
    if (contentHash) {
      const duplicate = await findDuplicateByHash(classId, contentHash);
      if (duplicate) {
        return rejectResponse("duplicate_content", storageKey, 409);
      }
    }

    // Persist material with PROCESSING status — user sees it immediately
    await createMaterial({
      materialId,
      classId,
      fileName,
      fileType,
      storageKey,
      materialType,
      uploadedBy: session.user.email,
      uploadedByName: session.user.name,
      status: "PROCESSING",
      uploadedAt: new Date().toISOString(),
      fileSizeBytes: fileSize ?? undefined,
      fileExtension: fileExtension ?? undefined,
      contentHashSha256: contentHash ?? undefined,
      parserStatus: "queued",
    });

    // Log upload event
    await logMaterialUploadEvent({
      materialId,
      classId,
      userEmail: session.user.email,
      eventType: "upload",
      eventStage: "metadata_saved",
      decision: forceReview ? "FORCE_REVIEW" : undefined,
      reasonCode: forceReview ? "suspicious_upload_pattern" : undefined,
    });

    const firstName = session.user.name?.split(" ")[0] ?? session.user.email.split("@")[0];
    await logActivityEvent({
      userEmail: session.user.email,
      firstName,
      eventType: "upload",
      description: `${firstName} uploaded ${fileName}`,
      fileName,
      classId,
    });

    // If abuse pattern detected, skip AI eval and route directly to review
    if (forceReview) {
      // Update to PENDING_REVIEW (overrides the PROCESSING status)
      const { updateMaterialEvaluation } = await import("@/lib/db");
      await updateMaterialEvaluation(classId, materialId, {
        status: "PENDING_REVIEW",
        rejectionCode: "suspicious_upload_pattern",
        rejectionReason: REASON_MESSAGES.suspicious_upload_pattern,
      });
      return NextResponse.json<ApiResponse>(
        { success: true, message: REASON_MESSAGES.suspicious_upload_pattern, data: { materialId, status: "PENDING_REVIEW" } },
        { status: 201 }
      );
    }

    // Build class context for AI evaluation
    let classContext = "";
    try {
      const { getClassesByIds } = await import("@/lib/db");
      const classes = await getClassesByIds([classId]);
      const classData = classes.length > 0 ? classes[0] : null;
      if (classData) {
        classContext = `
Course Code: ${classData.courseCode}
Course Name: ${classData.courseName}
Department: ${classData.department || "Unknown"}
Description: ${classData.description || "No description available."}

Syllabus / Official Course Details:
${classData.syllabus || "No syllabus provided."}
`.trim();
      }
    } catch (err) {
      console.error("[Class Context Error]", err);
    }

    // Fire-and-forget: trigger Python evaluation (non-blocking)
    // If Python is immediately unreachable, the .catch() cleans up so the
    // material does not hang in PROCESSING forever.
    fetch(aiBackendUrl("/evaluate-and-ingest"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        materialId,
        storageKey,
        fileName,
        classContext,
        userEmail: session.user.email,
      }),
    }).catch(async (err) => {
      console.error("[AI Eval Fire Error] Python unreachable — marking FAILED and cleaning up:", err);
      try {
        const { updateMaterialEvaluation } = await import("@/lib/db");
        await updateMaterialEvaluation(classId, materialId, {
          status: "FAILED",
          rejectionCode: "python_unavailable",
          rejectionReason: "AI processing service was unavailable at upload time.",
        });
        await supabase.storage.from(STORAGE_BUCKET).remove([storageKey]);
      } catch (cleanupErr) {
        console.error("[AI Eval Cleanup Error]", cleanupErr);
      }
    });

    // Return immediately — Python will update the material status directly in the DB
    return NextResponse.json<ApiResponse>(
      { success: true, message: "Processing started.", data: { materialId, status: "PROCESSING" } },
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

// ============================================================
// DELETE — remove a material
// ============================================================

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
    // Note: storageKey from the query string is intentionally ignored below.
    // We always use material.storageKey from the DB to prevent path manipulation.

    if (!materialId || !classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Missing required parameters." },
        { status: 400 }
      );
    }

    const { getMaterial } = await import("@/lib/db");
    const material = await getMaterial(classId, materialId);

    if (!material) {
      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Material already removed.",
      });
    }

    const admin = await isAdmin(session.user.email);

    if (material.uploadedBy !== session.user.email && !admin) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "You are not authorized to delete this material." },
        { status: 403 }
      );
    }

    // Step 1: Delete from Supabase Storage — only if the file still exists there.
    // FAILED materials have their storage file deleted automatically at failure time,
    // so we skip this step to avoid a noisy "not found" warning.
    const dbStorageKey = material.storageKey;
    if (dbStorageKey && material.status !== "FAILED") {
      const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([dbStorageKey]);
      if (storageError) {
        console.warn("[Storage Delete Warning]", storageError);
      }
    }

    // Step 2: Delete from DB
    await deleteMaterial(classId, materialId);

    // Step 3: Delete vectors from PostgreSQL via Python backend
    try {
      await fetch(aiBackendUrl(`/materials/${materialId}`), { method: "DELETE" });
    } catch (err) {
      console.error("[Python Sync Error] Failed to delete vectors from PostgreSQL.", err);
    }

    // Log deletion event (best-effort — don't let logging failures
    // mask a successful deletion)
    try {
      await logMaterialUploadEvent({
        materialId,
        classId,
        userEmail: session.user.email,
        eventType: "deletion",
        eventStage: "deleted",
        decision: "DELETED",
      });
    } catch (logErr) {
      console.warn("[Delete Log Warning] Failed to log deletion event:", logErr);
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
