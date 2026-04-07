/**
 * POST /api/classes/[classId]/personal-resources
 * GET  /api/classes/[classId]/personal-resources
 *
 * Premium only — generate or retrieve personal study tools from selected materials.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getEffectivePlan } from "@/lib/plan";
import { checkQuota, recordUsage, type QuotaApiType } from "@/lib/quota";
import type { ApiResponse } from "@/types";

function clampQuestionCount(value: unknown, defaultValue = 15) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.min(30, Math.max(5, Math.trunc(parsed)));
}

/**
 * GET — list all personal resources for the current user in this class.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { classId } = await params;

    const { data, error } = await supabase
      .from("personal_resources")
      .select("*")
      .eq("user_email", session.user.email.toLowerCase())
      .eq("class_id", classId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Personal resources fetched.",
      data: data ?? [],
    });
  } catch (error) {
    console.error("[Personal Resources GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to fetch personal resources." },
      { status: 500 }
    );
  }
}

/**
 * POST — generate a new personal resource from selected materials.
 *
 * Body: { resourceType: 'exam' | 'study_plan' | 'flashcards', materialIds: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { classId } = await params;
    const plan = await getEffectivePlan(session.user.email);

    if (plan !== "premium") {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Upgrade to Premium to create personal study tools." },
        { status: 403 }
      );
    }

    const { resourceType, materialIds, questionCount, difficulty } = await request.json();

    if (!resourceType || !["exam", "study_plan", "flashcards"].includes(resourceType)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Invalid resourceType." },
        { status: 400 }
      );
    }

    if (!materialIds || !Array.isArray(materialIds) || materialIds.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "At least one materialId is required." },
        { status: 400 }
      );
    }

    // Check quota
    const quotaType = resourceType as QuotaApiType;
    const quota = await checkQuota(session.user.email, plan, quotaType);
    if (!quota.allowed) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: `Daily limit reached (${quota.limit}/${quota.limit}). Try again tomorrow.`,
        },
        { status: 429 }
      );
    }

    // Map resource type to Python backend endpoint
    const endpointMap: Record<string, string> = {
      exam: "http://localhost:8000/generate/practice-exam",
      study_plan: "http://localhost:8000/generate/study-plan",
      flashcards: "http://localhost:8000/generate/flashcards",
    };

    // Call the Python backend with specific materialIds
    const res = await fetch(endpointMap[resourceType], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        materialIds,
        questionCount: clampQuestionCount(questionCount, 15),
        difficulty: typeof difficulty === "string" && difficulty.trim() ? difficulty.trim() : "Medium",
      }),
    });

    if (!res.ok) {
      throw new Error(`Python backend error: ${res.statusText}`);
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || "Generation failed.");
    }

    // Normalize backend response envelope by resource type so content_json is
    // directly consumable by frontend pages.
    let normalizedContent: unknown = json.data;
    const clampedQuestionCount = clampQuestionCount(questionCount, 15);

    if (resourceType === "exam") {
      normalizedContent = json.data?.practiceExam ?? json.data;
    } else if (resourceType === "study_plan") {
      normalizedContent = json.data?.studyPlan ?? json.data;
    } else if (resourceType === "flashcards") {
      normalizedContent = json.data?.flashcards ?? json.data;
    }

    // Save to personal_resources table
    const examPayload = resourceType === "exam"
      ? {
          suggested_question_count: clampedQuestionCount,
          question_count: Array.isArray(normalizedContent)
            ? normalizedContent.length
            : typeof normalizedContent === "object" && normalizedContent !== null && Array.isArray((normalizedContent as { questions?: unknown[] }).questions)
              ? (normalizedContent as { questions: unknown[] }).questions.length
              : clampedQuestionCount,
          difficulty: typeof difficulty === "string" && difficulty.trim() ? difficulty.trim() : "Medium",
        }
      : {};

    const { data: sessionRow, error: sessionError } = resourceType === "exam"
      ? await supabase
          .from("exam_sessions")
          .insert({
            class_id: classId,
            user_email: session.user.email.toLowerCase(),
            exam_scope: "personal",
            resource_type: "exam",
            suggested_question_count: clampedQuestionCount,
            question_count: (examPayload as { question_count: number }).question_count,
            difficulty: (examPayload as { difficulty: string }).difficulty,
            material_ids: materialIds,
            content_json: normalizedContent,
            generation_status: "ready",
          })
          .select()
          .single()
      : { data: null, error: null };

    if (sessionError) throw new Error(sessionError.message);

    const { data: saved, error: saveError } = await supabase
      .from("personal_resources")
      .insert({
        user_email: session.user.email.toLowerCase(),
        class_id: classId,
        resource_type: resourceType,
        material_ids: materialIds,
        content_json: normalizedContent,
        exam_session_id: resourceType === "exam" ? sessionRow?.id ?? null : null,
        suggested_question_count: resourceType === "exam" ? clampedQuestionCount : null,
        question_count: resourceType === "exam" ? (examPayload as { question_count: number }).question_count : null,
        difficulty: resourceType === "exam" ? (examPayload as { difficulty: string }).difficulty : null,
      })
      .select()
      .single();

    if (saveError) throw new Error(saveError.message);

    // Record usage
    await recordUsage(session.user.email, quotaType, classId);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Personal resource generated.",
      data: saved,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("[Personal Resources POST Error]", error);
    const messageText = error instanceof Error ? error.message : String(error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: messageText.includes("fetch")
          ? "AI backend unavailable. Please try again later."
          : "Failed to generate personal resource.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE — delete a specific personal resource
 * DELETE /api/classes/[classId]/personal-resources?id=...
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "ID is required." },
        { status: 400 }
      );
    }

    const { classId } = await params;

    const { error } = await supabase
      .from("personal_resources")
      .delete()
      .eq("id", id)
      .eq("user_email", session.user.email.toLowerCase())
      .eq("class_id", classId);

    if (error) throw new Error(error.message);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Personal resource deleted.",
    });
  } catch (error) {
    console.error("[Personal Resources DELETE Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to delete resource." },
      { status: 500 }
    );
  }
}
