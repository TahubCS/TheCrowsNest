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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for NextAuth session token cookie
  const hasToken =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  // Check if onboarding is complete (set by onboarding API)
  const onboardingComplete =
    request.cookies.get("onboarding-complete")?.value === "true";

  // --- Unauthenticated users ---
  // If accessing protected pages without auth, redirect to login
  if (
    (pathname.startsWith("/dashboard") || pathname === "/onboarding") &&
    !hasToken
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // --- Authenticated but not onboarded ---
  // If accessing dashboard without completing onboarding, redirect to onboarding
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
    // If not onboarded, send to onboarding instead of dashboard
    if (!onboardingComplete) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// Only run proxy on these paths
export const config = {
  matcher: ["/", "/login", "/signup", "/onboarding", "/dashboard/:path*"],
};
