/**
 * POST /api/auth/register/verify
 * 
 * Step 2 of 2FA: Verify the 6-digit code and create the real user account.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getPendingVerification,
  deletePendingVerification,
  createUser,
  getUserByEmail,
} from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // --- Look up the pending verification ---
    const pending = await getPendingVerification(normalizedEmail);

    if (!pending) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "No verification request found. Please sign up again." },
        { status: 404 }
      );
    }

    // --- Check expiry ---
    const now = Math.floor(Date.now() / 1000);
    if (pending.expiresAt < now) {
      await deletePendingVerification(normalizedEmail);
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Verification code has expired. Please sign up again." },
        { status: 410 }
      );
    }

    // --- Validate the code ---
    if (pending.verificationCode !== code.toString().trim()) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Invalid verification code. Please try again." },
        { status: 400 }
      );
    }

    // --- Double-check no one registered this email in the meantime ---
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      await deletePendingVerification(normalizedEmail);
      return NextResponse.json<ApiResponse>(
        { success: false, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // --- Create the real user ---
    const pirateId = normalizedEmail.split("@")[0];
    const userId = crypto.randomUUID();

    await createUser({
      id: userId,
      name: pending.name,
      email: normalizedEmail,
      passwordHash: pending.passwordHash,
      pirateId,
      enrolledClasses: [],
      onboardingComplete: false,
      isAdmin: false,
      createdAt: new Date().toISOString(),
    });

    // --- Clean up the pending verification ---
    await deletePendingVerification(normalizedEmail);

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: "Email verified! Your account has been created. You can now log in.",
        data: { userId },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[Register Verify Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
