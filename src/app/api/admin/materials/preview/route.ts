/**
 * GET /api/admin/materials/preview?storageKey=...
 *
 * Returns a Supabase Storage signed URL so the admin can preview/download
 * the uploaded file directly in the browser.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
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

    const storageKey = request.nextUrl.searchParams.get("storageKey");
    if (!storageKey) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "storageKey query parameter is required" },
        { status: 400 }
      );
    }

    // 15-minute expiry for preview
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storageKey, 900);

    if (error || !data) {
      console.error("[Admin Preview Error] Supabase Storage:", error);
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Failed to generate preview URL" },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Preview URL generated",
      data: { previewUrl: data.signedUrl },
    });
  } catch (error) {
    console.error("[Admin Preview Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to generate preview URL" },
      { status: 500 }
    );
  }
}
