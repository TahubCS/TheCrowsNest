/**
 * POST /api/auth/register
 * 
 * Register a new ECU student.
 * Simplified: only name, email, password.
 * PirateID is auto-extracted from email.
 * Major/year set later during onboarding.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail } from "@/lib/db";
import { validateEcuEmail, validatePassword } from "@/lib/validators";
import type { RegisterPayload, ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterPayload;
    const { name, email, password } = body;

    // --- Validate required fields ---
    if (!name || !email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "All fields are required." },
        { status: 400 }
      );
    }

    // --- Validate ECU email ---
    const emailCheck = validateEcuEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: emailCheck.message },
        { status: 400 }
      );
    }

    // --- Validate password ---
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: passwordCheck.message },
        { status: 400 }
      );
    }

    // --- Check if user already exists ---
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // --- Hash password ---
    const passwordHash = await bcrypt.hash(password, 12);

    // --- Auto-extract pirateId from email ---
    const pirateId = email.trim().toLowerCase().split("@")[0];

    // --- Create user in DynamoDB ---
    const userId = crypto.randomUUID();
    await createUser({
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      pirateId,
      enrolledClasses: [],
      onboardingComplete: false,
      isAdmin: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: "Account created successfully! You can now log in.",
        data: { userId },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    // DynamoDB conditional check failure = duplicate email (race condition)
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    console.error("[Register Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
