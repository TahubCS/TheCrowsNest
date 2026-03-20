// Shared types for TheCrowsNest — used by both server and client branches

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  pirateId: string;
  major: string;
  classes: string[];
  createdAt: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  pirateId: string;
  major: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// Extend NextAuth session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      major: string;
      pirateId: string;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    major: string;
    pirateId: string;
  }

  interface JWT {
    id: string;
    major: string;
    pirateId: string;
  }
}
