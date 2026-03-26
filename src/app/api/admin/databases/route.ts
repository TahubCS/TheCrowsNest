import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
  },
});
const docClient = DynamoDBDocumentClient.from(client);

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const adminEmails = process.env.ADMIN_EMAILS || "";
    const emailsList = adminEmails.split(",").map((e) => e.trim().toLowerCase());
    if (!session?.user?.email || !emailsList.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table") || "TheCrowsNestUsers";

    // Validate table to prevent injection
    const allowedTables = ["TheCrowsNestUsers", "TheCrowsNestClasses", "TheCrowsNestMaterials", "TheCrowsNestStudyPlans"];
    if (!allowedTables.includes(table)) {
      return NextResponse.json({ success: false, message: "Invalid table" }, { status: 400 });
    }

    const result = await docClient.send(
      new ScanCommand({
        TableName: table,
        Limit: 50, // Preview limits to 50 items so we do not load all databases at once
      })
    );

    let items = result.Items || [];
    
    // Remove the unused 'classes' field from Users table preview
    if (table === "TheCrowsNestUsers") {
      items = items.map(item => {
        const { classes, ...rest } = item;
        return rest;
      });
    }

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("[Admin Database API Error]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch database preview" }, { status: 500 });
  }
}
