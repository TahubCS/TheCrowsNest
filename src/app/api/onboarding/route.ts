/**
 * POST /api/onboarding
 * 
 * Save the user's onboarding profile (level, major, year, classes).
 * Marks onboardingComplete = true in the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateUserProfile, getClassesByIds, getUserByEmail } from "@/lib/db";
import { ECU_MAJORS, STUDY_LEVELS, YEARS_OF_STUDY } from "@/lib/data/ecu-majors";
import type { OnboardingPayload, ApiResponse } from "@/types";

const MAX_CREDIT_HOURS = 18;

export async function POST(request: NextRequest) {
  try {
    // --- Auth check ---
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as OnboardingPayload;
    const { level, major, yearOfStudy, enrolledClasses } = body;

    // --- Validate level ---
    if (!level || !STUDY_LEVELS.includes(level as typeof STUDY_LEVELS[number])) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Please select a valid level of study." },
        { status: 400 }
      );
    }

    // --- Validate major ---
    // The frontend dropdown values are formatted as "Major Name (Degree)" e.g., "Computer Science (BS)"
    // Our predefined ECU_MAJORS are just "Computer Science"
    // So we just check if any valid major name is *included* in what the user selected.
    const validMajor = ECU_MAJORS.find((m) => major && (major.startsWith(m.name) || major.includes(m.name)));
    if (!major || !validMajor) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Please select a valid ECU major." },
        { status: 400 }
      );
    }

    // --- Validate year ---
    const validYears = YEARS_OF_STUDY[level as keyof typeof YEARS_OF_STUDY] || [];
    if (!yearOfStudy || !validYears.includes(yearOfStudy as never)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Please select a valid year of study." },
        { status: 400 }
      );
    }

    // --- Validate credit hours ---
    if (enrolledClasses && enrolledClasses.length > 0) {
      const classes = await getClassesByIds(enrolledClasses);
      const totalCredits = classes.reduce((sum, c) => sum + c.creditHours, 0);

      if (totalCredits > MAX_CREDIT_HOURS) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            message: `You've selected ${totalCredits} credit hours. The maximum is ${MAX_CREDIT_HOURS}.`,
          },
          { status: 400 }
        );
      }
    }

    // --- Save to database ---
    await updateUserProfile(session.user.email, {
      level,
      major,
      yearOfStudy,
      enrolledClasses: enrolledClasses || [],
      onboardingComplete: true,
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: "Onboarding complete! Welcome to TheCrowsNest.",
        data: { level, major, yearOfStudy, enrolledClasses },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Onboarding Error]", error);
    
    // Bubble up the actual error for debugging
    const errorDetails = error?.message || error?.name || String(error);
    
    return NextResponse.json<ApiResponse>(
      { success: false, message: `Server Error: ${errorDetails}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding
 * 
 * Returns the user's current onboarding status + data for the onboarding form.
 */
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

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "OK",
      data: {
        onboardingComplete: user?.onboardingComplete ?? false,
        level: user?.level || null,
        major: user?.major || null,
        yearOfStudy: user?.yearOfStudy || null,
        enrolledClasses: user?.enrolledClasses || [],
      },
    });
  } catch (error) {
    console.error("[Onboarding GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
