/**
 * Next.js 16 Proxy (formerly middleware.ts)
 *
 * IMPORTANT: This is NOT a security boundary.
 * Auth checks are done in server components via requireAuth().
 *
 * This proxy handles:
 * 1. Redirect unauthenticated users away from protected pages → /login
 * 2. Redirect logged-in users away from public auth pages → /dashboard
 * 3. Redirect users who haven't completed onboarding → /onboarding
 */

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read onboardingComplete directly from the JWT — no separate cookie needed.
  // getToken decodes the same session token NextAuth already sets, so it's
  // always in sync with updateSession() calls from the client.
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "authjs.session-token" // NextAuth v5 cookie name
  });
  const hasToken = !!token;
  const onboardingComplete = (token?.onboardingComplete as boolean) ?? false;

  // --- Unauthenticated users ---
  if (
    (pathname.startsWith("/dashboard") || pathname === "/onboarding") &&
    !hasToken
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // --- Authenticated but not onboarded ---
  if (pathname.startsWith("/dashboard") && hasToken && !onboardingComplete) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // --- Already onboarded but visiting onboarding page ---
  if (pathname === "/onboarding" && hasToken && onboardingComplete) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // --- Logged in and visiting public auth pages ---
  if (
    (pathname === "/" || pathname === "/login" || pathname === "/signup") &&
    hasToken
  ) {
    return NextResponse.redirect(
      new URL(onboardingComplete ? "/dashboard" : "/onboarding", request.url)
    );
  }

  return NextResponse.next();
}

// Only run proxy on these paths
export const config = {
  matcher: ["/", "/login", "/signup", "/onboarding", "/dashboard/:path*"],
};
