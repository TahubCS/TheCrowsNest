/**
 * GET  /api/admin/classes  — Get all classes (admin only)
 * POST /api/admin/classes  — Create a new class (admin only)
 * PATCH /api/admin/classes — Update editable class fields (admin only)
 * DELETE /api/admin/classes — Delete an unused class after explicit confirmation (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
  deleteClassIfUnused,
  getAllClasses,
  getClassById,
  getClassUsageTotal,
  putClass,
  updateClass,
} from "@/lib/db";
import type { ApiResponse, CourseClass } from "@/types";

// isAdmin is now imported from @/lib/admin (DB-backed)

async function requireAdmin(): Promise<NextResponse<ApiResponse> | null> {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Unauthorized" },
      { status: 403 }
    );
  }

  return null;
}

function normalizeCreditHours(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 3;
  return Math.min(6, Math.max(1, Math.trunc(parsed)));
}

function normalizeRelatedMajors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((major): major is string => typeof major === "string");
}

function formatUsageMessage(usage: Awaited<ReturnType<typeof deleteClassIfUnused>>["usage"]): string {
  const labels: Array<[keyof typeof usage, string]> = [
    ["enrolledUsers", "enrolled users"],
    ["enrolledCount", "recorded enrollments"],
    ["materials", "materials"],
    ["studyPlans", "study plans"],
    ["sharedResources", "shared resources"],
    ["personalResources", "personal resources"],
    ["examSessions", "exam sessions"],
    ["reports", "reports"],
    ["materialUploadEvents", "upload events"],
    ["sharedMaterialCoverage", "material coverage records"],
    ["activityFeed", "activity feed rows"],
  ];

  const blockers = labels
    .filter(([key]) => usage[key] > 0)
    .map(([key, label]) => `${usage[key]} ${label}`);

  return blockers.length > 0
    ? `Class still has linked data: ${blockers.join(", ")}.`
    : "Class still has linked data.";
}

export async function GET() {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

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
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const { courseCode, courseName, department, creditHours, description, syllabus, relatedMajors } = await request.json();

    if (!courseCode || !courseName || !department) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "courseCode, courseName, and department are required." },
        { status: 400 }
      );
    }

    // Generate a URL-friendly classId from the courseCode (e.g. "BIOL 1050" → "biol1050")
    const classId = courseCode.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (!classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Course code must include letters or numbers." },
        { status: 400 }
      );
    }

    const existingClass = await getClassById(classId);
    if (existingClass) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "A class with this course code already exists. Use Edit instead." },
        { status: 409 }
      );
    }

    const newClass: CourseClass = {
      classId,
      courseCode: courseCode.toUpperCase().trim(),
      courseName: courseName.trim(),
      department,
      creditHours: normalizeCreditHours(creditHours),
      description: description || "",
      relatedMajors: normalizeRelatedMajors(relatedMajors),
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

export async function PATCH(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const { classId, courseName, department, creditHours, description, syllabus, relatedMajors } = await request.json();

    if (!classId || !courseName || !department) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId, courseName, and department are required." },
        { status: 400 }
      );
    }

    const updated = await updateClass(classId, {
      courseName: courseName.trim(),
      department,
      creditHours: normalizeCreditHours(creditHours),
      description: description || "",
      relatedMajors: normalizeRelatedMajors(relatedMajors),
      syllabus: syllabus?.trim() ? syllabus.trim() : null,
    });

    if (!updated) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Class not found." },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Class updated successfully.",
    });
  } catch (error) {
    console.error("[Admin Classes PATCH Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to update class" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;

    const { classId, confirmation } = await request.json();

    if (!classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId is required." },
        { status: 400 }
      );
    }

    if (confirmation !== "delete permanently") {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Confirmation phrase does not match." },
        { status: 400 }
      );
    }

    const result = await deleteClassIfUnused(classId);

    if (!result.exists) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Class not found." },
        { status: 404 }
      );
    }

    if (!result.deleted && getClassUsageTotal(result.usage) > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: formatUsageMessage(result.usage), data: result.usage },
        { status: 409 }
      );
    }

    if (!result.deleted) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Failed to delete class." },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Class deleted permanently.",
    });
  } catch (error) {
    console.error("[Admin Classes DELETE Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to delete class" },
      { status: 500 }
    );
  }
}
