/**
 * GET /api/requests - Get current user's class requests
 * POST /api/requests - Submit a new class request
 * 
 * Persisted to the requests table.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClassRequest, getRequestsByEmail } from "@/lib/db";
import type { ClassRequest, ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRequests = await getRequestsByEmail(session.user.email);

    // Sort by newest first
    userRequests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Fetched requests",
      data: userRequests,
    });
  } catch (error) {
    console.error("[Requests GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { courseCode, courseName, department } = body;

    if (!courseCode || !courseName || !department) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Missing required fields: courseCode, courseName, department" },
        { status: 400 }
      );
    }

    const newRequest: ClassRequest = {
      requestId: crypto.randomUUID(),
      courseCode: courseCode.toUpperCase(),
      courseName,
      department,
      status: "PENDING",
      userEmail: session.user.email,
      userName: session.user.name || undefined,
      createdAt: new Date().toISOString(),
    };

    await createClassRequest(newRequest);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Class request submitted successfully",
      data: newRequest,
    }, { status: 201 });
  } catch (error) {
    console.error("[Requests POST Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to submit request" },
      { status: 500 }
    );
  }
}
