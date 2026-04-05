/**
 * GET  /api/admin/requests  — Get all class requests (admin only)
 * PATCH /api/admin/requests — Update a request's status (approve/reject)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getAllRequests, updateRequestStatus } from "@/lib/db";
import type { ApiResponse } from "@/types";

// isAdmin is now imported from @/lib/admin (DB-backed)

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const requests = await getAllRequests();

    // Sort by newest first
    requests.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Fetched all requests",
      data: requests,
    });
  } catch (error) {
    console.error("[Admin Requests GET Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { requestId, status, adminNote } = await request.json();

    if (!requestId || !status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "requestId and valid status (APPROVED/REJECTED) are required" },
        { status: 400 }
      );
    }

    await updateRequestStatus(requestId, status, adminNote);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Request ${status.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error("[Admin Requests PATCH Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to update request" },
      { status: 500 }
    );
  }
}
