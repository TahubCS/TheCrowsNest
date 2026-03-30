/**
 * GET /api/admin/materials/preview?s3Key=...
 *
 * Returns a presigned GET URL so the admin can preview/download
 * the uploaded file directly in the browser.
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
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

function isAdmin(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS || "";
  const emailsList = adminEmails.split(",").map((e) => e.trim().toLowerCase());
  return emailsList.includes(email.toLowerCase());
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const s3Key = request.nextUrl.searchParams.get("s3Key");
    if (!s3Key) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "s3Key query parameter is required" },
        { status: 400 }
      );
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
    });

    // 15-minute expiry for preview
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Preview URL generated",
      data: { previewUrl: presignedUrl },
    });
  } catch (error) {
    console.error("[Admin Preview Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to generate preview URL" },
      { status: 500 }
    );
  }
}
