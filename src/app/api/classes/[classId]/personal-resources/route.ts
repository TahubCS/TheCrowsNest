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

    const { resourceType, materialIds } = await request.json();

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
      body: JSON.stringify({ classId, materialIds }),
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
    if (resourceType === "exam") {
      normalizedContent = json.data?.practiceExam ?? json.data;
    } else if (resourceType === "study_plan") {
      normalizedContent = json.data?.studyPlan ?? json.data;
    } else if (resourceType === "flashcards") {
      normalizedContent = json.data?.flashcards ?? json.data;
    }

    // Save to personal_resources table
    const { data: saved, error: saveError } = await supabase
      .from("personal_resources")
      .insert({
        user_email: session.user.email.toLowerCase(),
        class_id: classId,
        resource_type: resourceType,
        material_ids: materialIds,
        content_json: normalizedContent,
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
