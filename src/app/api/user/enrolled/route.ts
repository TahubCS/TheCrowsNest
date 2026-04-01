/**
 * GET /api/user/enrolled
 * 
 * Returns the current user's enrolled class IDs directly from the database.
 * This bypasses the JWT session cache to always return fresh data.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail } from "@/lib/db";
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

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: true,
        message: "User not found, returning empty enrollment.",
        data: { enrolledClasses: [] },
      });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Enrolled classes",
      data: { enrolledClasses: user.enrolledClasses || [] },
    });
  } catch (error) {
    console.error("[Enrolled GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
