/**
 * NextAuth.js v5 Configuration
 * 
 * Uses credentials provider (email + password) with JWT sessions.
 * Validates against DynamoDB user store.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "ECU Login",
      credentials: {
        email: { label: "ECU Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        // Look up user in DynamoDB
        const user = await getUserByEmail(email);
        if (!user) return null;

        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        // Return user object — this becomes the JWT payload
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          major: user.major,
          pirateId: user.pirateId,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/", // Use the landing page as the sign-in page
  },

  callbacks: {
    // Embed custom fields in the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.major = user.major as string;
        token.pirateId = user.pirateId as string;
      }
      return token;
    },

    // Expose custom fields on the session object
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.major = token.major as string;
        session.user.pirateId = token.pirateId as string;
      }
      return session;
    },
  },
});
