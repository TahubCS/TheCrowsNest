/**
 * POST /api/ai-tutor
 *
 * Premium only — proxies chat to the Python backend.
 * Free users get a 403.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { aiBackendUrl } from "@/lib/ai-backend";
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

    const res = await fetch(aiBackendUrl("/chat/stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, messages: [{ role: "user", content: question }] }),
    });

    if (!res.ok) {
      const backendErrorText = await res.text().catch(() => "");
      throw new Error(
        `Python backend error (${res.status}): ${backendErrorText || res.statusText || "Unknown error"}`
      );
    }

    // Record usage before streaming starts
    await recordUsage(session.user.email, "chat", classId);

    return new Response(res.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Quota-Remaining": String(quota.remaining - 1),
      },
    });
  } catch (error: unknown) {
    console.error("[AI Tutor Error]", error);
    const message = error instanceof Error ? error.message : String(error);
    const isConnectivityError =
      message.includes("fetch failed") ||
      message.includes("ENOTFOUND") ||
      message.includes("ECONNREFUSED") ||
      message.includes("AI_BACKEND_URL is not configured");

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: isConnectivityError
          ? "Failed to connect to the Python AI service. Please verify AI_BACKEND_URL and backend health."
          : message || "Failed to generate AI response.",
      },
      { status: 500 }
    );
  }
}
