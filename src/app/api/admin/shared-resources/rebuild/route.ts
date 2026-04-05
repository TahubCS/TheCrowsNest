/**
 * POST /api/admin/shared-resources/rebuild?classId=...
 *
 * Admin only — force-regenerate shared resources for a class.
 * Useful for debugging or after a bug fix.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const classId = request.nextUrl.searchParams.get("classId");
    if (!classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId query parameter is required." },
        { status: 400 }
      );
    }

    // Call the Python backend to regenerate shared resources
    const res = await fetch("http://localhost:8000/generate/shared-resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    });

    if (!res.ok) {
      throw new Error(`Python backend error: ${res.statusText}`);
    }

    const json = await res.json();

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Shared resources rebuild triggered for class '${classId}'.`,
      data: json,
    });
  } catch (error: any) {
    console.error("[Admin Shared Resources Rebuild Error]", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: error.message?.includes("fetch")
          ? "AI backend unavailable."
          : "Failed to rebuild shared resources.",
      },
      { status: 500 }
    );
  }
}
