/**
 * GET  /api/admin/classes  — Get all classes (admin only)
 * POST /api/admin/classes  — Create a new class (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getAllClasses, putClass } from "@/lib/db";
import type { ApiResponse, CourseClass } from "@/types";

// isAdmin is now imported from @/lib/admin (DB-backed)

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const classes = await getAllClasses();

    // Sort alphabetically by courseCode
    classes.sort((a, b) => a.courseCode.localeCompare(b.courseCode));

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Fetched all classes",
      data: classes,
    });
  } catch (error) {
    console.error("[Admin Classes GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to fetch classes" },
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

    const { courseCode, courseName, department, creditHours, description, syllabus, relatedMajors } = await request.json();

    if (!courseCode || !courseName || !department) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "courseCode, courseName, and department are required." },
        { status: 400 }
      );
    }

    // Generate a URL-friendly classId from the courseCode (e.g. "BIOL 1050" → "biol1050")
    const classId = courseCode.toLowerCase().replace(/[^a-z0-9]/g, "");

    const newClass: CourseClass = {
      classId,
      courseCode: courseCode.toUpperCase().trim(),
      courseName: courseName.trim(),
      department,
      creditHours: creditHours || 3,
      description: description || "",
      relatedMajors: relatedMajors || [],
      enrolledCount: 0,
      ...(syllabus ? { syllabus: syllabus.trim() } : {}),
    };

    await putClass(newClass);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Class "${courseCode}" created successfully.`,
      data: newClass,
    });
  } catch (error) {
    console.error("[Admin Classes POST Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to create class" },
      { status: 500 }
    );
  }
}
