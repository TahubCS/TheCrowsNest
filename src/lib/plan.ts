/**
 * Plan helpers — determine the effective subscription plan for a user.
 *
 * Reads directly from users table (single source of truth after consolidation).
 * Admins can override their effective plan via dev_mode_plan for UI testing.
 */

import { getUserByEmail } from "@/lib/db";

/**
 * Get the effective subscription plan for a user.
 *
 * For admins: returns dev_mode_plan if set (simulated plan for UI testing).
 * For everyone: returns subscription_plan, defaulting to 'free'.
 */
export async function getEffectivePlan(
  email: string
): Promise<"free" | "premium"> {
  const user = await getUserByEmail(email);
  if (!user) return "free";

  // Admin dev-mode override
  if (user.isAdmin && user.devModePlan) {
    return user.devModePlan as "free" | "premium";
  }

  return (user.subscriptionPlan as "free" | "premium") ?? "free";
}
