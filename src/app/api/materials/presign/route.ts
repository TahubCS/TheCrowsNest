/**
 * POST /api/materials/presign
 *
 * Returns a Supabase Storage signed upload URL so the browser can upload directly.
 * The client uploads to Supabase Storage, then calls POST /api/materials to save metadata.
 *
 * Gates enforced here (UP-001 through UP-005):
 * - MIME allowlist
 * - MIME ↔ extension match
 * - File size limit
 * - Filename sanitization
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import {
  UPLOAD_THRESHOLDS,
  ALLOWED_MIME_TYPES,
  canonicalExtension,
  extensionMatchesMime,
  sanitizeFilename,
  extractExtension,
  REASON_MESSAGES,
  type ReasonCode,
} from "@/lib/upload-safety";
import type { ApiResponse } from "@/types";

function reject(reasonCode: ReasonCode, status = 400) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      message: REASON_MESSAGES[reasonCode],
      data: { reasonCode },
    },
    { status }
  );
}

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

    // UP-001: MIME allowlist
    if (!ALLOWED_MIME_TYPES.has(fileType)) {
      return reject("unsupported_type");
    }

    // UP-003: File size limit
    if (fileSize > UPLOAD_THRESHOLDS.maxFileSizeBytes) {
      return reject("file_too_large");
    }

    // UP-005: Filename sanitization
    const safeName = sanitizeFilename(fileName);
    if (!safeName) {
      return reject("invalid_filename");
    }

    // UP-002: Extension ↔ MIME match
    const ext = extractExtension(safeName);
    if (!ext || !extensionMatchesMime(ext, fileType)) {
      return reject("mime_extension_mismatch");
    }

    const storageExt = canonicalExtension(fileType) ?? ext;
    const materialId = crypto.randomUUID();
    const storageKey = `materials/${classId}/${materialId}.${storageExt}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storageKey);

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
      data: {
        presignedUrl: data.signedUrl,
        storageKey,
        materialId,
        fileExtension: storageExt,
      },
    });
  } catch (error) {
    console.error("[Presign Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to generate upload URL." },
      { status: 500 }
    );
  }
}
