/**
 * GET  /api/admin/dev-mode  — get current simulated plan
 * POST /api/admin/dev-mode  — toggle simulated plan
 *
 * Admin only. Invisible to regular users.
 * Allows admins to simulate free/premium UI without a separate test account.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getUserByEmail, updateUserDevMode } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const user = await getUserByEmail(session.user.email);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Dev mode status.",
      data: { activePlan: user?.devModePlan ?? "premium" },
    });
  } catch (error) {
    console.error("[Admin Dev-Mode GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to get dev mode." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { plan } = await request.json();

    if (!plan || !["free", "premium"].includes(plan)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Invalid plan. Must be 'free' or 'premium'." },
        { status: 400 }
      );
    }

    await updateUserDevMode(session.user.email, plan as "free" | "premium");

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Dev mode set to '${plan}'.`,
      data: { activePlan: plan },
    });
  } catch (error) {
    console.error("[Admin Dev-Mode POST Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to update dev mode." },
      { status: 500 }
    );
  }
}
