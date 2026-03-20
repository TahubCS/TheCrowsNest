/**
 * Client-side Providers
 * 
 * Wraps the app with SessionProvider so that client components
 * can use useSession() to access the current user's session.
 */

"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
