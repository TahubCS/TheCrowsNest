/**
 * GET /api/data/onboarding-options
 * 
 * Returns the predefined data needed for the onboarding form:
 * - Study levels
 * - ECU majors (grouped by college)
 * - Years of study (per level)
 */

import { NextResponse } from "next/server";
import { ECU_MAJORS, STUDY_LEVELS, YEARS_OF_STUDY, getMajorsByCollege } from "@/lib/data/ecu-majors";
import type { ApiResponse } from "@/types";

export async function GET() {
  return NextResponse.json<ApiResponse>({
    success: true,
    message: "Onboarding options",
    data: {
      levels: STUDY_LEVELS,
      majors: ECU_MAJORS,
      majorsByCollege: getMajorsByCollege(),
      yearsOfStudy: YEARS_OF_STUDY,
    },
  });
}
