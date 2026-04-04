/**
 * GET /api/materials/status?materialId=...&classId=...
 *
 * Lightweight polling endpoint — returns only status + parserStatus
 * so the client can show live processing stages without fetching everything.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMaterialStatus } from "@/lib/db";
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

    const result = await getMaterialStatus(classId, materialId);
    if (!result) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Material not found." },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "OK",
      data: result,
    });
  } catch (error) {
    console.error("[Material Status Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
