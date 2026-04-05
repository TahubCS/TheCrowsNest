/**
 * GET   /api/admin/materials        — Get all PENDING_REVIEW materials (admin only)
 * PATCH /api/admin/materials        — Approve or reject a material
 *
 * On approve: triggers Python backend processing, then marks PROCESSED.
 * On reject:  deletes from Supabase Storage, marks REJECTED with optional reason.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getAllPendingMaterials, updateMaterialStatus, updateMaterialWithRejection } from "@/lib/db";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import type { ApiResponse } from "@/types";

// isAdmin is now imported from @/lib/admin (DB-backed)

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
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
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { classId, materialId, storageKey, fileName, action, rejectionReason } = await request.json();

    if (!classId || !materialId || !action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId, materialId, and valid action (APPROVE/REJECT) are required" },
        { status: 400 }
      );
    }

    if (action === "REJECT") {
      // Delete file from Supabase Storage
      if (storageKey) {
        const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([storageKey]);
        if (storageError) {
          console.error("[Storage Delete Error on Reject]", storageError);
          // Continue with DB cleanup even if storage delete fails
        }
      }

      const sevenDaysFromNow = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
      await updateMaterialWithRejection(classId, materialId, "REJECTED", rejectionReason || "No reason provided", sevenDaysFromNow);

      return NextResponse.json<ApiResponse>({
        success: true,
        message: "File deleted and material marked as rejected",
      });
    }

    // APPROVE flow: mark as PROCESSING, trigger Python backend, then PROCESSED
    if (!storageKey || !fileName) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "storageKey and fileName are required for approval" },
        { status: 400 }
      );
    }

    await updateMaterialStatus(classId, materialId, "PROCESSING");

    try {
      const res = await fetch("http://localhost:8000/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, materialId, storageKey, fileName }),
      });

      if (!res.ok) {
        throw new Error(`Python Backend Error: ${res.statusText}`);
      }

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
