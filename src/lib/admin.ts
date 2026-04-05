/**
 * Admin helpers — DB-backed admin check.
 *
 * Replaces the old `process.env.ADMIN_EMAILS` pattern with a lookup
 * against the `admins` table. Uses the service-role Supabase client
 * so RLS is bypassed (the admins table has no public read access).
 */

import { supabase } from "@/lib/supabase";

/**
 * Check if an email belongs to an admin.
 * Uses the service-role client so no RLS restrictions apply.
 */
export async function isAdmin(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("admins")
    .select("email")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    console.error("[Admin Check Error]", error);
    return false;
  }

  return !!data;
}
