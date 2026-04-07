/**
 * GenAI API quota enforcement.
 *
 * Checks the genai_usage table against quota_config to determine
 * how many API calls a user has remaining today.
 *
 * Free tier: 0 for everything (shared resources are pre-generated).
 * Premium tier: 25 chat, 5 exam, 5 study_plan, 5 flashcards per day.
 */

import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

export type QuotaApiType = "chat" | "exam" | "study_plan" | "flashcards";

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/**
 * Check whether a user has remaining quota for a specific GenAI API action.
 */
export async function checkQuota(
  userEmail: string,
  plan: "free" | "premium",
  apiType: QuotaApiType
): Promise<QuotaResult> {
  const isUserAdmin = await isAdmin(userEmail);
  if (isUserAdmin) {
    return { allowed: true, remaining: 9999, limit: 9999 };
  }

  // 1. Get the daily limit for this plan + api type
  const { data: config } = await supabase
    .from("quota_config")
    .select("daily_limit")
    .eq("plan", plan)
    .eq("api_type", apiType)
    .single();

  const limit = config?.daily_limit ?? 0;

  if (limit === 0) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  // 2. Count how many times this user has called this API today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("genai_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_email", userEmail.toLowerCase())
    .eq("api_type", apiType)
    .gte("called_at", today.toISOString());

  if (error) {
    console.error("[Quota Check Error]", error);
    // Fail open — allow the request but log the error
    return { allowed: true, remaining: limit, limit };
  }

  const used = count ?? 0;
  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
  };
}

/**
 * Record a GenAI API usage event.
 * Call this AFTER a successful API call to increment the user's usage count.
 */
export async function recordUsage(
  userEmail: string,
  apiType: QuotaApiType,
  classId?: string
): Promise<void> {
  const { error } = await supabase.from("genai_usage").insert({
    user_email: userEmail.toLowerCase(),
    api_type: apiType,
    class_id: classId ?? null,
  });

  if (error) {
    console.error("[Quota Record Error]", error);
  }
}
