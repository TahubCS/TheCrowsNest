/**
 * POST /api/auth/register
 * 
 * Step 1 of 2FA: Validate inputs, generate a 6-digit verification code,
 * store the pending registration in DynamoDB, and email the code.
 * 
 * The user's real account is NOT created here — it's only created
 * after successful verification via /api/auth/register/verify.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getUserByEmail, savePendingVerification, createUser } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
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

    /** 
     * SIDELINED 2FA LOGIC
     * 
    // --- Generate cryptographically secure 6-digit code ---
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60; // 15 minutes from now

    await savePendingVerification({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      passwordHash,
      verificationCode,
      expiresAt,
    });
    
    // --- Send the verification email ---
    await sendVerificationEmail(
      email.trim().toLowerCase(),
      verificationCode,
      name.trim().split(" ")[0] // First name only for the greeting
    );
    */

    // --- Create the real user IMMEDIATELY (Bypass 2FA) ---
    const normalizedEmail = email.trim().toLowerCase();
    const pirateId = normalizedEmail.split("@")[0];
    const userId = crypto.randomUUID();

    await createUser({
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: passwordHash,
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
    console.error("[Register Send Code Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
