/**
 * PATCH /api/user/profile
 * 
 * Updates the current user's profile information (name, major, yearOfStudy).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateUserProfile } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { name, major, yearOfStudy } = await request.json();

    // Basic validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Name is too short" },
        { status: 400 }
      );
    }

    await updateUserProfile(session.user.email, {
      name,
      major,
      yearOfStudy
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error("[Profile PATCH Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to update profile" },
      { status: 500 }
    );
  }
}
