/**
 * PATCH /api/study-plans/[planId]
 * Update the status of a single item in a personal study plan.
 * Body: { itemId: string, status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateStudyPlanItemStatus } from "@/lib/db";
import type { ApiResponse } from "@/types";

const VALID_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED"] as const;
type ItemStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { planId } = await params;
    const { itemId, status } = await request.json();

    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "itemId is required." },
        { status: 400 }
      );
    }

    if (!status || !VALID_STATUSES.includes(status as ItemStatus)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: `status must be one of: ${VALID_STATUSES.join(", ")}.` },
        { status: 400 }
      );
    }

    await updateStudyPlanItemStatus(planId, session.user.email, itemId, status as ItemStatus);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Item status updated.",
    });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 404) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Plan not found." },
        { status: 404 }
      );
    }
    console.error("[Study Plan PATCH Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to update item status." },
      { status: 500 }
    );
  }
}
