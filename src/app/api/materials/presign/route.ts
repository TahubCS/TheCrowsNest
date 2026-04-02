/**
 * POST /api/materials/presign
 *
 * Returns a Supabase Storage signed upload URL so the browser can upload directly.
 * The client uploads to Supabase Storage, then calls POST /api/materials to save metadata.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import type { ApiResponse } from "@/types";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "image/png": "png",
  "image/jpeg": "jpg",
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { fileName, fileType, fileSize, classId } = await request.json();

    if (!fileName || !fileType || !fileSize || !classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "fileName, fileType, fileSize, and classId are required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES[fileType]) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "File type not allowed. Use PDF, PPTX, DOCX, DOC, PNG, or JPG." },
        { status: 400 }
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "File too large. Maximum size is 20MB." },
        { status: 400 }
      );
    }

    const ext = ALLOWED_TYPES[fileType];
    const materialId = crypto.randomUUID();
    const s3Key = `materials/${classId}/${materialId}.${ext}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(s3Key);

    if (error || !data) {
      console.error("[Presign Error] Supabase Storage:", error);
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Failed to generate upload URL." },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Presigned URL generated.",
      data: { presignedUrl: data.signedUrl, s3Key, materialId },
    });
  } catch (error) {
    console.error("[Presign Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to generate upload URL." },
      { status: 500 }
    );
  }
}
