/**
 * NextAuth.js v5 Configuration
 * 
 * Uses credentials provider (email + password) with JWT sessions.
 * Validates against PostgreSQL user store.
 * Includes onboardingComplete, isAdmin, pirateId in session.
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

        // Look up user in database
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
          pirateId: user.pirateId,
          major: user.major || "",
          yearOfStudy: user.yearOfStudy || "",
          enrolledClasses: user.enrolledClasses || [],
          onboardingComplete: user.onboardingComplete ?? false,
          isAdmin: user.isAdmin ?? false,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
      // Embed custom fields in the JWT token
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.pirateId = user.pirateId as string;
        token.major = user.major as string;
        token.yearOfStudy = user.yearOfStudy as string;
        token.onboardingComplete = user.onboardingComplete as boolean;
        token.isAdmin = user.isAdmin as boolean;
        token.enrolledClasses = user.enrolledClasses as string[];
      }

      // Allow session updates (e.g. after onboarding)
      if (trigger === "update") {
        if (token.email) {
          const freshUser = await getUserByEmail(token.email as string);
          if (freshUser) {
            token.name = freshUser.name;
            token.onboardingComplete = freshUser.onboardingComplete;
            token.major = freshUser.major;
            token.yearOfStudy = freshUser.yearOfStudy;
            token.enrolledClasses = freshUser.enrolledClasses || [];
          }
        }
        
        if (session) {
          if (session.name !== undefined) {
            token.name = session.name;
          }
          if (session.onboardingComplete !== undefined) {
            token.onboardingComplete = session.onboardingComplete;
          }
          if (session.major !== undefined) {
            token.major = session.major;
          }
          if (session.yearOfStudy !== undefined) {
            token.yearOfStudy = session.yearOfStudy;
          }
        }
      }

      return token;
    },

    // Expose custom fields on the session object
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.pirateId = token.pirateId as string;
        session.user.major = token.major as string;
        session.user.yearOfStudy = token.yearOfStudy as string;
        session.user.onboardingComplete = token.onboardingComplete as boolean;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.enrolledClasses = (token.enrolledClasses as string[]) || [];
      }
      return session;
    },
  },
});
