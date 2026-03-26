import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const adminEmails = process.env.ADMIN_EMAILS || "";
    const emailsList = adminEmails.split(",").map((e) => e.trim().toLowerCase());
    
    if (emailsList.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ isAdmin: true });
    }

    return NextResponse.json({ isAdmin: false });
  } catch (error) {
    console.error("[Admin Verify Error]", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
