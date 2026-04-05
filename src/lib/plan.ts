/**
 * Plan helpers — determine the effective subscription plan for a user.
 *
 * Supports admin dev-mode override: admins can simulate a different plan
 * for UI testing without modifying their actual subscription.
 */

import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

/**
 * Get the effective subscription plan for a user.
 *
 * For admins: checks admin_dev_mode table for a simulated plan.
 * For everyone: falls back to the profiles table, defaults to 'free'.
 */
export async function getEffectivePlan(
  email: string
): Promise<"free" | "premium"> {
  // Admin dev-mode override
  const admin = await isAdmin(email);
  if (admin) {
    const { data: devMode } = await supabase
      .from("admin_dev_mode")
      .select("active_plan")
      .eq("admin_email", email.toLowerCase())
      .maybeSingle();

    if (devMode?.active_plan) {
      return devMode.active_plan as "free" | "premium";
    }
  }

  // Normal user: fetch from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return (profile?.subscription_plan as "free" | "premium") ?? "free";
}
