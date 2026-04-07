import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getEffectivePlan } from "@/lib/plan";
import { checkQuota, recordUsage, type QuotaApiType } from "@/lib/quota";
import type { ApiResponse } from "@/types";

type SessionScope = "shared" | "personal";

type ExamContent = {
  title?: string;
  questions?: unknown[];
  [key: string]: unknown;
} | unknown[];

type ExamSessionRow = {
  id: string;
  class_id: string;
  user_email: string | null;
  exam_scope: SessionScope;
  resource_type: string;
  suggested_question_count: number;
  question_count: number;
  difficulty: string;
  material_ids: string[] | null;
  content_json: ExamContent;
  generation_status: string;
  created_at: string;
  updated_at: string;
};

type LegacyPersonalExamRow = {
  id?: string;
  exam_session_id?: string | null;
  user_email?: string | null;
  class_id?: string | null;
  resource_type?: string | null;
  suggested_question_count?: number | null;
  question_count?: number | null;
  difficulty?: string | null;
  material_ids?: string[] | null;
  content_json?: ExamContent | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function clampQuestionCount(value: unknown, defaultValue = 15) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.min(30, Math.max(5, Math.trunc(parsed)));
}

function getQuestionCount(content: ExamContent): number {
  if (Array.isArray(content)) {
    return content.length;
  }

  if (content && typeof content === "object" && Array.isArray((content as { questions?: unknown[] }).questions)) {
    return (content as { questions: unknown[] }).questions.length;
  }

  return 0;
}

function normalizeSessionRow(row: ExamSessionRow) {
  return {
    ...row,
    content_json: row.content_json ?? null,
  };
}

export async function GET(
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
    if (!classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId is required." },
        { status: 400 }
      );
    }

    const [{ data: sharedResources, error: sharedError }, { data: personalSessions, error: sessionsError }] = await Promise.all([
      supabase
        .from("shared_resources")
        .select("*")
        .eq("class_id", classId)
        .maybeSingle(),
      supabase
        .from("exam_sessions")
        .select("*")
        .eq("class_id", classId)
        .eq("user_email", session.user.email.toLowerCase())
        .eq("exam_scope", "personal")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const { data: legacyPersonalResources, error: legacyError } = await supabase
      .from("personal_resources")
      .select("*")
      .eq("class_id", classId)
      .eq("user_email", session.user.email.toLowerCase())
      .eq("resource_type", "exam")
      .order("created_at", { ascending: false })
      .limit(10);

    if (sharedError) {
      throw new Error(sharedError.message);
    }
    if (sessionsError) {
      throw new Error(sessionsError.message);
    }
    if (legacyError) {
      throw new Error(legacyError.message);
    }

    let sharedSession: ExamSessionRow | null = null;
    if (sharedResources?.shared_exam_session_id) {
      const { data: sessionRow, error: sharedSessionError } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("id", sharedResources.shared_exam_session_id)
        .maybeSingle();

      if (sharedSessionError) {
        throw new Error(sharedSessionError.message);
      }

      sharedSession = sessionRow as ExamSessionRow | null;
    } else if (sharedResources?.exam_json) {
      const fallbackContent = sharedResources.exam_json as ExamContent;
      sharedSession = {
        id: `shared-${classId}`,
        class_id: classId,
        user_email: null,
        exam_scope: "shared",
        resource_type: "exam",
        suggested_question_count: clampQuestionCount(sharedResources.shared_exam_question_count ?? getQuestionCount(fallbackContent) ?? 15),
        question_count: clampQuestionCount(sharedResources.shared_exam_question_count ?? getQuestionCount(fallbackContent) ?? 15),
        difficulty: "Medium",
        material_ids: [],
        content_json: fallbackContent,
        generation_status: sharedResources.generation_status ?? "ready",
        created_at: sharedResources.shared_exam_updated_at ?? sharedResources.updated_at ?? new Date().toISOString(),
        updated_at: sharedResources.shared_exam_updated_at ?? sharedResources.updated_at ?? new Date().toISOString(),
      };
    }

    const legacySessions = (legacyPersonalResources ?? [])
      .map((row) => row as LegacyPersonalExamRow)
      .filter((row) => row.content_json)
      .map((row) => ({
        id: row.exam_session_id ?? row.id ?? `legacy-${classId}-${row.created_at ?? Date.now()}`,
        class_id: classId,
        user_email: session.user.email.toLowerCase(),
        exam_scope: "personal" as const,
        resource_type: "exam" as const,
        suggested_question_count: clampQuestionCount(row.suggested_question_count ?? row.question_count ?? 15),
        question_count: clampQuestionCount(row.question_count ?? row.suggested_question_count ?? 15),
        difficulty: row.difficulty ?? "Medium",
        material_ids: row.material_ids ?? [],
        content_json: row.content_json as ExamContent,
        generation_status: "ready",
        created_at: row.created_at ?? row.updated_at ?? new Date().toISOString(),
        updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
      })) as ExamSessionRow[];

    const combinedPersonalSessions = [
      ...(personalSessions ?? []).map((row) => row as ExamSessionRow),
      ...legacySessions.filter((legacy) => !personalSessions?.some((sessionRow) => sessionRow.id === legacy.id)),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Exam sessions fetched.",
      data: {
        sharedSession: sharedSession ? normalizeSessionRow(sharedSession) : null,
        personalSessions: combinedPersonalSessions.map((row) => normalizeSessionRow(row)),
      },
    });
  } catch (error) {
    console.error("[Exam Sessions GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to fetch exam sessions." },
      { status: 500 }
    );
  }
}

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
    if (!classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId is required." },
        { status: 400 }
      );
    }

    const plan = await getEffectivePlan(session.user.email);
    if (plan !== "premium") {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Upgrade to Premium to generate personal practice exams." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const materialIds = Array.isArray(body?.materialIds) ? body.materialIds.filter((value: unknown) => typeof value === "string") : [];
    const topic = typeof body?.topic === "string" && body.topic.trim() ? body.topic.trim() : "General";
    const difficulty = typeof body?.difficulty === "string" && body.difficulty.trim() ? body.difficulty.trim() : "Medium";
    const questionCount = clampQuestionCount(body?.questionCount, 15);

    if (materialIds.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "At least one materialId is required." },
        { status: 400 }
      );
    }

    const quota = await checkQuota(session.user.email, plan, "exam" as QuotaApiType);
    if (!quota.allowed) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: `Daily exam generation limit reached (${quota.limit}/${quota.limit}). Try again tomorrow.`,
        },
        { status: 429 }
      );
    }

    const res = await fetch("http://localhost:8000/generate/practice-exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, topic, difficulty, count: questionCount, materialIds }),
    });

    if (!res.ok) {
      throw new Error(`Python Backend Error: ${res.statusText}`);
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || "Failed to generate practice exam.");
    }

    const normalizedContent: ExamContent = json.data?.practiceExam ?? json.data;
    const generatedQuestionCount = getQuestionCount(normalizedContent) || questionCount;

    const { data: savedSession, error: sessionError } = await supabase
      .from("exam_sessions")
      .insert({
        class_id: classId,
        user_email: session.user.email.toLowerCase(),
        exam_scope: "personal",
        resource_type: "exam",
        suggested_question_count: questionCount,
        question_count: generatedQuestionCount,
        difficulty,
        material_ids: materialIds,
        content_json: normalizedContent,
        generation_status: "ready",
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    const { data: savedResource, error: resourceError } = await supabase
      .from("personal_resources")
      .insert({
        user_email: session.user.email.toLowerCase(),
        class_id: classId,
        resource_type: "exam",
        material_ids: materialIds,
        exam_session_id: savedSession.id,
        suggested_question_count: questionCount,
        question_count: generatedQuestionCount,
        difficulty,
      })
      .select()
      .single();

    if (resourceError) {
      throw new Error(resourceError.message);
    }

    await recordUsage(session.user.email, "exam", classId);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Exam session generated.",
      data: {
        session: savedSession,
        resource: savedResource,
        practiceExam: normalizedContent,
        remaining: quota.remaining - 1,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[Exam Sessions POST Error]", error);
    const message = error instanceof Error ? error.message : "Failed to generate exam session.";
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: message.includes("fetch")
          ? "AI backend unavailable. Please try again later."
          : message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE — delete a specific personal exam session
 * DELETE /api/classes/[classId]/exam-sessions?id=...
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

    // We attempt to delete from both tables consecutively since legacy exams might be linked across boundaries
    await supabase
      .from("exam_sessions")
      .delete()
      .eq("id", id)
      .eq("user_email", session.user.email.toLowerCase())
      .eq("class_id", classId);

    await supabase
      .from("personal_resources")
      .delete()
      .eq("id", id)
      .eq("user_email", session.user.email.toLowerCase())
      .eq("class_id", classId);

    // Some legacy resources might use exam_session_id = id
    await supabase
      .from("personal_resources")
      .delete()
      .eq("exam_session_id", id)
      .eq("user_email", session.user.email.toLowerCase())
      .eq("class_id", classId);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Exam session deleted.",
    });
  } catch (error) {
    console.error("[Exam Sessions DELETE Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to delete exam session." },
      { status: 500 }
    );
  }
}
