/**
 * GET /api/materials/by-name?classId=...&fileName=...
 *
 * Resolves a material's fileName to its materialId + fileType so the client
 * can then call /api/materials/preview to get a signed URL.
 *
 * Access rules:
 * - Admins: any material, any status
 * - Students: APPROVED or PROCESSED only, must be enrolled in the class
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getMaterialByFileName, getUserByEmail } from "@/lib/db";
import type { ApiResponse } from "@/types";

const PREVIEWABLE_STATUSES = ["APPROVED", "PROCESSED"];

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
    const fileName = request.nextUrl.searchParams.get("fileName");

    if (!classId || !fileName) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId and fileName are required." },
        { status: 400 }
      );
    }

    const material = await getMaterialByFileName(classId, fileName);
    if (!material) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Material not found." },
        { status: 404 }
      );
    }

    const admin = await isAdmin(session.user.email);

    if (!admin) {
      if (!PREVIEWABLE_STATUSES.includes(material.status)) {
        return NextResponse.json<ApiResponse>(
          { success: false, message: "This material is not available for preview yet." },
          { status: 403 }
        );
      }
      const user = await getUserByEmail(session.user.email);
      if (!user?.enrolledClasses?.includes(classId)) {
        return NextResponse.json<ApiResponse>(
          { success: false, message: "You are not enrolled in this class." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Material found.",
      data: {
        materialId: material.materialId,
        fileType: material.fileType,
        fileName: material.fileName,
      },
    });
  } catch (error) {
    console.error("[By-Name Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to locate material." },
      { status: 500 }
    );
  }
}
