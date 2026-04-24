/**
 * GET   /api/admin/reports — Get all reports (admin only)
 * PATCH /api/admin/reports — Update a report's status (review/dismiss)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getAllReports, updateReportStatus } from "@/lib/db";
import type { ApiResponse } from "@/types";

// isAdmin is now imported from @/lib/admin (DB-backed)

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const reports = await getAllReports();

    // Sort by newest first
    reports.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Fetched all reports",
      data: reports,
    });
  } catch (error) {
    console.error("[Admin Reports GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to fetch reports" },
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

    const { reportId, status } = await request.json();

    if (!reportId || !status || !["REVIEWED", "DISMISSED"].includes(status)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "reportId and valid status (REVIEWED/DISMISSED) are required" },
        { status: 400 }
      );
    }

    await updateReportStatus(reportId, status);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Report ${status.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error("[Admin Reports PATCH Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to update report" },
      { status: 500 }
    );
  }
}
