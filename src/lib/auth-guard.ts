/**
 * Server-side Auth Guard
 * 
 * Use this in server components and API routes to verify the session.
 * This is the REAL security boundary (not proxy.ts).
 * 
 * Next.js 16: proxy.ts is only for lightweight redirects.
 * Auth checks belong in server components and API routes.
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Call this at the top of any server component or API route
 * that requires authentication. Redirects to "/" if not logged in.
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return session;
}

/**
 * Optional: get session without redirecting (returns null if unauthenticated)
 */
export async function getOptionalSession() {
  return await auth();
}
