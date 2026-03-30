/**
 * POST /api/reports — Submit a new report (user or document)
 * 
 * Persisted to DynamoDB (TheCrowsNestReports table).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createReport } from "@/lib/db";
import type { Report, ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, targetId, targetName, classId, reason, details } = body;

    if (!type || !targetId || !targetName || !reason) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "type, targetId, targetName, and reason are required" },
        { status: 400 }
      );
    }

    if (!["USER", "DOCUMENT"].includes(type)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "type must be USER or DOCUMENT" },
        { status: 400 }
      );
    }

    const newReport: Report = {
      reportId: crypto.randomUUID(),
      type,
      targetId,
      targetName,
      classId: classId || undefined,
      reason,
      details: details || undefined,
      status: "OPEN",
      reportedBy: session.user.email,
      reportedByName: session.user.name || undefined,
      createdAt: new Date().toISOString(),
    };

    await createReport(newReport);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Report submitted successfully. An admin will review it shortly.",
      data: { reportId: newReport.reportId },
    }, { status: 201 });
  } catch (error) {
    console.error("[Reports POST Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to submit report" },
      { status: 500 }
    );
  }
}
