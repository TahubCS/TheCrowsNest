/**
 * POST /api/practice-exams
 *
 * Premium only — generates a practice exam via the Python backend.
 * Free users consume shared resources (no API call).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEffectivePlan } from "@/lib/plan";
import { checkQuota, recordUsage } from "@/lib/quota";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    // Plan gate — premium only for personal generation
    const plan = await getEffectivePlan(session.user.email);
    if (plan !== "premium") {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Upgrade to Premium to generate custom practice exams." },
        { status: 403 }
      );
    }

    // Quota check
    const quota = await checkQuota(session.user.email, plan, "exam");
    if (!quota.allowed) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: `Daily exam generation limit reached (${quota.limit}/${quota.limit}). Try again tomorrow.`,
        },
        { status: 429 }
      );
    }

    const { classId, topic, difficulty, format } = await request.json();

    if (!classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId is required." },
        { status: 400 }
      );
    }

    const res = await fetch("http://localhost:8000/generate/practice-exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, topic, difficulty, count: format === "Short Quiz" ? 5 : 10 }),
    });

    if (!res.ok) {
      throw new Error(`Python Backend Error: ${res.statusText}`);
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || "Failed to generate practice exam.");
    }

    let questions = json.data.practiceExam.questions || [];

    // Record usage
    await recordUsage(session.user.email, "exam", classId);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Exam generated.",
      data: { questions, remaining: quota.remaining - 1 },
    });
  } catch (error: any) {
    console.error("[Exam Generation Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: error.message?.includes("fetch") ? "Failed to connect to the Python AI server. Please make sure the python backend is running on port 8000." : "Failed to generate practice exam." },
      { status: 500 }
    );
  }
}
