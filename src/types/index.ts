// Shared types for TheCrowsNest — used by both server and client branches

// ============================================================
// User
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  pirateId: string; // auto-extracted from email
  // Profile fields — set during onboarding
  level?: string; // "Undergraduate" | "Masters" | "Doctoral"
  major?: string; // from predefined ECU majors
  yearOfStudy?: string; // "Freshman" | "Sophomore" | "Junior" | "Senior"
  enrolledClasses: string[]; // array of classIds
  onboardingComplete: boolean;
  isAdmin: boolean;
  createdAt: string;
}

// ============================================================
// Registration (simplified — only name, email, password)
// ============================================================

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

// ============================================================
// Onboarding
// ============================================================

export interface OnboardingPayload {
  level: string;
  major: string;
  yearOfStudy: string;
  enrolledClasses: string[];
}

// ============================================================
// Classes
// ============================================================

export interface CourseClass {
  classId: string; // e.g. "csci1010"
  courseCode: string; // e.g. "CSCI 1010"
  courseName: string; // e.g. "Algorithmic Problem Solving"
  department: string; // e.g. "Computer Science"
  creditHours: number; // 1-4
  description: string;
  relatedMajors: string[]; // which majors typically take this
  enrolledCount: number; // social proof
}

export interface EnrollPayload {
  classId: string;
}

// ============================================================
// Materials (future)
// ============================================================

export interface Material {
  materialId: string;
  classId: string;
  fileName: string;
  fileType: string;
  s3Key: string;
  materialType: string; // "Syllabus" | "Lecture Slides" | "Study Guide" | "Past Exam" | "Notes" | "Other"
  uploadedBy: string; // user email
  uploadedByName: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason?: string;
  uploadedAt: string;
}

// ============================================================
// Study Plans
// ============================================================

export interface StudyPlanItem {
  classId: string;
  semester: string; // e.g., "Fall 2026"
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  itemId?: string;
  title?: string;
  type?: string;
}

export interface StudyPlan {
  planId: string;
  classId?: string;
  userEmail: string;
  title: string;
  description?: string;
  items: StudyPlanItem[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// API Response
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// ============================================================
// NextAuth type extensions
// ============================================================

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      pirateId: string;
      major: string;
      yearOfStudy: string;
      onboardingComplete: boolean;
      isAdmin: boolean;
      enrolledClasses?: string[];
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    pirateId: string;
    major: string;
    yearOfStudy: string;
    onboardingComplete: boolean;
    isAdmin: boolean;
    enrolledClasses?: string[];
  }

  interface JWT {
    id: string;
    pirateId: string;
    major: string;
    yearOfStudy: string;
    onboardingComplete: boolean;
    isAdmin: boolean;
    enrolledClasses?: string[];
  }
}
