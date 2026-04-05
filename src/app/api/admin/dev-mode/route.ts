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
import { supabase } from "@/lib/supabase";
import type { ApiResponse } from "@/types";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { data } = await supabase
      .from("admin_dev_mode")
      .select("active_plan")
      .eq("admin_email", session.user.email.toLowerCase())
      .maybeSingle();

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Dev mode status.",
      data: { activePlan: data?.active_plan ?? "premium" },
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

    const { error } = await supabase
      .from("admin_dev_mode")
      .upsert(
        {
          admin_email: session.user.email.toLowerCase(),
          active_plan: plan,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "admin_email" }
      );

    if (error) throw new Error(error.message);

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
