import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

    const answer = json.reply;

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Answer generated.",
      data: {
        answer,
        sourcesUsed: 1, // Fallback since actual citation links handling can be added later
        relevanceScores: [],
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
