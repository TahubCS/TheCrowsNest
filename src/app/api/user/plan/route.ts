/**
 * GET /api/user/plan
 *
 * Returns the current user's effective subscription plan.
 * Used by the frontend usePlan() hook.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getEffectivePlan } from "@/lib/plan";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const plan = await getEffectivePlan(session.user.email);
    const admin = await isAdmin(session.user.email);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Plan fetched.",
      data: { plan, isAdmin: admin },
    });
  } catch (error) {
    console.error("[User Plan GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to fetch plan." },
      { status: 500 }
    );
  }
}
