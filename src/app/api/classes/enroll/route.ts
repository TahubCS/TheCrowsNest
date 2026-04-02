/**
 * POST /api/classes/enroll
 * DELETE /api/classes/enroll
 * 
 * Enroll or unenroll a student from a class.
 * Validates credit hour limits (max 18).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserByEmail,
  getClassById,
  getClassesByIds,
  enrollUserInClass,
  unenrollUserFromClass,
  incrementClassEnrollment,
  decrementClassEnrollment,
} from "@/lib/db";
import type { EnrollPayload, ApiResponse } from "@/types";

const MAX_CREDIT_HOURS = 18;

/**
 * Helper: get class from DB
 */
async function resolveClass(classId: string) {
  return await getClassById(classId);
}

/**
 * POST — Enroll in a class
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as EnrollPayload;
    const { classId } = body;

    if (!classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId is required." },
        { status: 400 }
      );
    }

    // Get user
    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    // Check if already enrolled
    if (user.enrolledClasses?.includes(classId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "You are already enrolled in this class." },
        { status: 409 }
      );
    }

    // Get the class to enroll in
    const classToEnroll = await resolveClass(classId);
    if (!classToEnroll) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Class not found." },
        { status: 404 }
      );
    }

    // Calculate current credit hours
    const currentClasses = await getClassesByIds(user.enrolledClasses || []);
    const currentCredits = currentClasses.reduce((sum, c) => sum + c.creditHours, 0);

    const newTotal = currentCredits + classToEnroll.creditHours;
    if (newTotal > MAX_CREDIT_HOURS) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: `Cannot enroll: ${newTotal} credit hours exceeds the ${MAX_CREDIT_HOURS} hour maximum. Current: ${currentCredits}h, this class: ${classToEnroll.creditHours}h.`,
        },
        { status: 400 }
      );
    }

    // Enroll
    await enrollUserInClass(session.user.email, classId);
    await incrementClassEnrollment(classId).catch(() => {}); // Best effort

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Enrolled in ${classToEnroll.courseCode} — ${classToEnroll.courseName}`,
      data: { classId, totalCredits: newTotal },
    });
  } catch (error) {
    console.error("[Enroll Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Unenroll from a class
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as EnrollPayload;
    const { classId } = body;

    if (!classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId is required." },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    if (!user.enrolledClasses?.includes(classId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "You are not enrolled in this class." },
        { status: 400 }
      );
    }

    await unenrollUserFromClass(
      session.user.email,
      user.enrolledClasses,
      classId
    );
    await decrementClassEnrollment(classId).catch(() => {}); // Best effort

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Successfully unenrolled.",
      data: { classId },
    });
  } catch (error) {
    console.error("[Unenroll Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
