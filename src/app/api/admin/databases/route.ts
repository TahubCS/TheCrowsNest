import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

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
    const allowedTables = ["TheCrowsNestUsers", "TheCrowsNestClasses", "TheCrowsNestMaterials", "TheCrowsNestStudyPlans", "TheCrowsNestRequests", "TheCrowsNestReports"];
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

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    const adminEmails = process.env.ADMIN_EMAILS || "";
    const emailsList = adminEmails.split(",").map((e) => e.trim().toLowerCase());
    if (!session?.user?.email || !emailsList.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { table, item } = body;

    const allowedTables = ["TheCrowsNestUsers", "TheCrowsNestClasses", "TheCrowsNestMaterials", "TheCrowsNestStudyPlans", "TheCrowsNestRequests", "TheCrowsNestReports"];
    if (!allowedTables.includes(table)) {
      return NextResponse.json({ success: false, message: "Invalid table" }, { status: 400 });
    }

    await docClient.send(
      new PutCommand({
        TableName: table,
        Item: item,
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Database PUT Error]", error);
    return NextResponse.json({ success: false, message: "Failed to save item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const adminEmails = process.env.ADMIN_EMAILS || "";
    const emailsList = adminEmails.split(",").map((e) => e.trim().toLowerCase());
    if (!session?.user?.email || !emailsList.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const keysParam = searchParams.get("keys");

    if (!table || !keysParam) {
       return NextResponse.json({ success: false, message: "Missing params" }, { status: 400 });
    }

    const allowedTables = ["TheCrowsNestUsers", "TheCrowsNestClasses", "TheCrowsNestMaterials", "TheCrowsNestStudyPlans", "TheCrowsNestRequests", "TheCrowsNestReports"];
    if (!allowedTables.includes(table)) {
      return NextResponse.json({ success: false, message: "Invalid table" }, { status: 400 });
    }

    let keys;
    try {
      keys = JSON.parse(decodeURIComponent(keysParam));
    } catch {
      return NextResponse.json({ success: false, message: "Invalid keys format" }, { status: 400 });
    }

    await docClient.send(
      new DeleteCommand({
        TableName: table,
        Key: keys,
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Database DELETE Error]", error);
    return NextResponse.json({ success: false, message: "Failed to delete item" }, { status: 500 });
  }
}
