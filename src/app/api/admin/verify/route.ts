import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const admin = await isAdmin(session.user.email);
    return NextResponse.json({ isAdmin: admin });
  } catch (error) {
    console.error("[Admin Verify Error]", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
