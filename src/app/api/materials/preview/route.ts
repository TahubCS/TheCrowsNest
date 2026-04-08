/**
 * GET /api/materials/preview?materialId=...&classId=...
 *
 * Returns a 15-minute Supabase Storage signed URL for previewing a material.
 *
 * Access rules:
 * - Admins: can preview any material regardless of status or class enrollment
 * - Students: can only preview APPROVED or PROCESSED materials in classes they are enrolled in
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getMaterial, getUserByEmail } from "@/lib/db";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
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

    if (!materialId || !classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "materialId and classId are required." },
        { status: 400 }
      );
    }

    const material = await getMaterial(classId, materialId);
    if (!material) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Material not found." },
        { status: 404 }
      );
    }

    const admin = await isAdmin(session.user.email);

    if (!admin) {
      // Students may only preview materials that have been approved/processed
      const previewableStatuses = ["APPROVED", "PROCESSED"];
      if (!previewableStatuses.includes(material.status)) {
        return NextResponse.json<ApiResponse>(
          { success: false, message: "This material is not available for preview." },
          { status: 403 }
        );
      }

      // Must be enrolled in the class
      const user = await getUserByEmail(session.user.email);
      if (!user?.enrolledClasses?.includes(classId)) {
        return NextResponse.json<ApiResponse>(
          { success: false, message: "You are not enrolled in this class." },
          { status: 403 }
        );
      }
    }

    // 15-minute signed URL
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(material.storageKey, 900);

    if (error || !data) {
      console.error("[Preview Error] Supabase Storage:", error);
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Failed to generate preview URL." },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Preview URL generated.",
      data: {
        previewUrl: data.signedUrl,
        fileName: material.fileName,
        fileType: material.fileType,
      },
    });
  } catch (error) {
    console.error("[Preview Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to generate preview URL." },
      { status: 500 }
    );
  }
}
