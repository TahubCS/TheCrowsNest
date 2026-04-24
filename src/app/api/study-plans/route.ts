/**
 * GET /api/study-plans
 * POST /api/study-plans
 * DELETE /api/study-plans?id=...
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStudyPlansByEmail, createStudyPlan, deleteStudyPlan, getClassById, incrementMaterialPopularity, logActivityEvent } from "@/lib/db";
import type { StudyPlan, ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json<ApiResponse>({ success: false, message: "classId is required" }, { status: 400 });
    }

    const plans = await getStudyPlansByEmail(session.user.email, classId);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Fetched study plans",
      data: { plans },
    });
  } catch (error) {
    console.error("[StudyPlans GET Error]", error);
    return NextResponse.json<ApiResponse>({ success: false, message: "Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, classId, items, materialIds } = body;

    if (!title || !classId) {
      return NextResponse.json<ApiResponse>({ success: false, message: "Title and classId are required" }, { status: 400 });
    }

    const plan: StudyPlan = {
      planId: crypto.randomUUID(),
      classId,
      userEmail: session.user.email,
      title,
      description: description || "",
      items: items || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createStudyPlan(plan);

    if (Array.isArray(materialIds) && materialIds.length > 0) {
      try {
        await incrementMaterialPopularity(classId, materialIds);
      } catch (popularityError) {
        console.warn("[Material Popularity Warning] Failed to increment selected materials:", popularityError);
      }
    }

    const firstName = session.user.name?.split(" ")[0] ?? session.user.email.split("@")[0];
    const classData = await getClassById(classId).catch(() => null);
    const courseCode = classData?.courseCode ?? classId;
    await logActivityEvent({
      userEmail: session.user.email,
      firstName,
      eventType: "study_plan",
      description: `${firstName} created a Study Plan in ${courseCode}`,
      classId,
      courseCode,
      resourceType: "study_plan",
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Study plan created",
      data: { plan },
    }, { status: 201 });
  } catch (error) {
    console.error("[StudyPlans POST Error]", error);
    return NextResponse.json<ApiResponse>({ success: false, message: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("id");

    if (!planId) {
      return NextResponse.json<ApiResponse>({ success: false, message: "Plan ID is required" }, { status: 400 });
    }

    // Usually you'd check if the plan belongs to the user, but we'll assume yes for now
    await deleteStudyPlan(planId);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Study plan deleted",
      data: { planId },
    });
  } catch (error) {
    console.error("[StudyPlans DELETE Error]", error);
    return NextResponse.json<ApiResponse>({ success: false, message: "Server Error" }, { status: 500 });
  }
}
