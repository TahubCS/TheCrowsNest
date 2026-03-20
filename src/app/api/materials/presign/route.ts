/**
 * POST /api/materials/presign
 *
 * Returns a presigned S3 PUT URL so the browser can upload directly to S3.
 * The client uploads to S3, then calls POST /api/materials to save metadata.
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    ...(process.env.AWS_SESSION_TOKEN && {
      sessionToken: process.env.AWS_SESSION_TOKEN,
    }),
  },
});

const BUCKET = "thecrowsnest";
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

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: fileType,
      ContentLength: fileSize,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Presigned URL generated.",
      data: { presignedUrl, s3Key, materialId },
    });
  } catch (error) {
    console.error("[Presign Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to generate upload URL." },
      { status: 500 }
    );
  }
}
