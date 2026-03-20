/**
 * NextAuth.js v5 Catch-All Route
 * 
 * Handles all /api/auth/* routes:
 * - GET /api/auth/session
 * - POST /api/auth/signin
 * - POST /api/auth/signout
 * - etc.
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
