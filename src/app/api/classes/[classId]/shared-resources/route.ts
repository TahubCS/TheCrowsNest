/**
 * GET /api/classes/[classId]/shared-resources
 *
 * Returns the pre-generated shared resources (exam, study plan, flashcards)
 * for a class. Available to BOTH free and premium users.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { ApiResponse } from "@/types";

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

    if (!classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("shared_resources")
      .select("*")
      .eq("class_id", classId)
      .maybeSingle();

    if (error) {
      throw new Error(`DB error: ${error.message}`);
    }

    if (!data) {
      return NextResponse.json<ApiResponse>({
        success: true,
        message: "No shared resources generated yet for this class.",
        data: {
          generationStatus: "idle",
          exam: null,
          sharedExamSession: null,
          studyPlan: null,
          flashcards: null,
        },
      });
    }

    let sharedExamSession: unknown = null;
    if (data.shared_exam_session_id) {
      const { data: examSession } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("id", data.shared_exam_session_id)
        .maybeSingle();

      sharedExamSession = examSession ?? null;
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Shared resources fetched.",
      data: {
        generationStatus: data.generation_status,
        exam: data.exam_json,
        sharedExamSession,
        studyPlan: data.study_plan_json,
        flashcards: data.flashcards_json,
        updatedAt: data.updated_at,
        sharedExamQuestionCount: data.shared_exam_question_count,
        sharedExamUpdatedAt: data.shared_exam_updated_at,
      },
    });
  } catch (error) {
    console.error("[Shared Resources GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to fetch shared resources." },
      { status: 500 }
    );
  }
}
