/**
 * Next.js 16 Proxy (formerly middleware.ts)
 * 
 * IMPORTANT: This is NOT a security boundary.
 * Auth checks are done in server components via requireAuth().
 * 
 * This proxy only provides a quick redirect hint — if there's no
 * auth session token cookie, redirect away from protected pages.
 */

import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for NextAuth session token cookie
  const hasToken =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  // If accessing dashboard without a token cookie, redirect to landing
  if (pathname.startsWith("/dashboard") && !hasToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If logged in and visiting the landing page, redirect to dashboard
  if (pathname === "/" && hasToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// Only run proxy on these paths
export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
