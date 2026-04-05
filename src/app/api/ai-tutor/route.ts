/**
 * POST /api/ai-tutor
 *
 * Premium only — proxies chat to the Python backend.
 * Free users get a 403.
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

    // Plan gate — premium only
    const plan = await getEffectivePlan(session.user.email);
    if (plan !== "premium") {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Upgrade to Premium to use the AI Tutor." },
        { status: 403 }
      );
    }

    // Quota check
    const quota = await checkQuota(session.user.email, plan, "chat");
    if (!quota.allowed) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: `Daily chat limit reached (${quota.limit}/${quota.limit}). Try again tomorrow.`,
          data: { remaining: 0, limit: quota.limit },
        },
        { status: 429 }
      );
    }

    const { classId, question } = await request.json();

    if (!classId || !question) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId and question are required." },
        { status: 400 }
      );
    }

    const res = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, messages: [{ role: "user", content: question }] }),
    });

    if (!res.ok) {
      throw new Error(`Python Backend Error: ${res.statusText}`);
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || "Failed to generate AI answer.");
    }

    // Record usage after successful call
    await recordUsage(session.user.email, "chat", classId);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Answer generated.",
      data: {
        answer: json.reply,
        sourcesUsed: 1,
        relevanceScores: [],
        remaining: quota.remaining - 1,
      },
    });
  } catch (error: any) {
    console.error("[AI Tutor Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: error.message?.includes("fetch") ? "Failed to connect to the Python AI server. Please make sure the python backend is running on port 8000." : "Failed to generate AI response." },
      { status: 500 }
    );
  }
}
