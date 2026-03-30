/**
 * GET /api/classes
 * 
 * Returns all available classes, or recommended classes for a major+year.
 * 
 * Query params:
 * - ?major=Computer+Science&year=Freshman → recommended classes
 * - (no params) → all classes
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllClasses, getClassesByIds } from "@/lib/db";
import { getRecommendedClassIds, ECU_CLASSES } from "@/lib/data/major-class-map";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const major = searchParams.get("major");
    const year = searchParams.get("year");
    const search = searchParams.get("search");

    // If major + year provided, return recommended classes
    if (major && year) {
      const recommendedIds = getRecommendedClassIds(major, year);

      if (recommendedIds.length > 0) {
        // Try to get from DynamoDB first, fall back to static data
        let classes = await getClassesByIds(recommendedIds);

        if (classes.length === 0) {
          // Fallback to static data if classes not yet seeded in DB
          classes = ECU_CLASSES.filter((c) =>
            recommendedIds.includes(c.classId)
          );
        }

        return NextResponse.json<ApiResponse>({
          success: true,
          message: "Recommended classes",
          data: { classes, source: "recommended" },
        });
      }
    }

    // Default: return all classes (try DB then static)
    let allClasses = await getAllClasses();
    if (allClasses.length === 0) {
      allClasses = ECU_CLASSES;
    }

    // If search query, filter the loaded classes
    if (search) {
      const query = search.toLowerCase();
      const filtered = allClasses.filter(
        (c) =>
          c.courseCode.toLowerCase().includes(query) ||
          c.courseName.toLowerCase().includes(query) ||
          c.department.toLowerCase().includes(query)
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        message: `Found ${filtered.length} classes`,
        data: { classes: filtered, source: "search" },
      });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "All classes",
      data: { classes: allClasses, source: "all" },
    });
  } catch (error) {
    console.error("[Classes GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
