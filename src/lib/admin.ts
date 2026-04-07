/**
 * Admin helpers — checks users.is_admin as the single source of truth.
 */

import { getUserByEmail } from "@/lib/db";

/**
 * Check if an email belongs to an admin.
 * Reads users.is_admin — the single admin flag after table consolidation.
 */
export async function isAdmin(email: string): Promise<boolean> {
  const user = await getUserByEmail(email);
  return user?.isAdmin ?? false;
}
