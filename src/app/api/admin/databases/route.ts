import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  transform: postgres.camel,
  ssl: "require",
  max: 5,
});

// Valid Postgres table names (allowlist)
const VALID_TABLES = new Set(["users", "classes", "materials", "study_plans", "requests", "reports"]);

// Primary key column per table (used for DELETE)
const TABLE_PK: Record<string, string> = {
  users: "email",
  classes: "class_id",
  materials: "material_id",
  study_plans: "plan_id",
  requests: "request_id",
  reports: "report_id",
};

function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS || "";
  return adminEmails.split(",").map((e) => e.trim().toLowerCase()).includes(email.toLowerCase());
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tableParam = searchParams.get("table") || "users";

    if (!VALID_TABLES.has(tableParam)) {
      return NextResponse.json({ success: false, message: "Invalid table" }, { status: 400 });
    }

    // sql.unsafe is safe here: tableParam is from a hardcoded allowlist, never user input
    const items = await sql.unsafe(`SELECT * FROM ${tableParam} LIMIT 50`);

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("[Admin Database API Error]", error);
    return NextResponse.json({ success: false, message: "Failed to fetch database preview" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { table, item } = body;

    if (!VALID_TABLES.has(table)) {
      return NextResponse.json({ success: false, message: "Invalid table" }, { status: 400 });
    }

    const pkCol = TABLE_PK[table];

    // Build snake_case column map from camelCase item keys
    const colMap: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      colMap[col] = value;
    }

    // Upsert using ON CONFLICT on the PK column
    await sql.unsafe(
      `INSERT INTO ${table} (${Object.keys(colMap).join(", ")})
       VALUES (${Object.keys(colMap).map((_, i) => `$${i + 1}`).join(", ")})
       ON CONFLICT (${pkCol}) DO UPDATE SET
       ${Object.keys(colMap).map((col, i) => `${col} = $${i + 1}`).join(", ")}`,
      Object.values(colMap) as (string | number | boolean | null)[]
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
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tableParam = searchParams.get("table");
    const keysParam = searchParams.get("keys");

    if (!tableParam || !keysParam) {
      return NextResponse.json({ success: false, message: "Missing params" }, { status: 400 });
    }

    if (!VALID_TABLES.has(tableParam)) {
      return NextResponse.json({ success: false, message: "Invalid table" }, { status: 400 });
    }

    const pkCol = TABLE_PK[tableParam];

    let keys: Record<string, unknown>;
    try {
      keys = JSON.parse(decodeURIComponent(keysParam));
    } catch {
      return NextResponse.json({ success: false, message: "Invalid keys format" }, { status: 400 });
    }

    // Find the PK value — try both camelCase and snake_case key forms
    const pkValue = keys[pkCol] ?? keys[pkCol.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
    if (pkValue === undefined) {
      return NextResponse.json({ success: false, message: "Primary key value not found in keys" }, { status: 400 });
    }

    await sql.unsafe(`DELETE FROM ${tableParam} WHERE ${pkCol} = $1`, [pkValue as string]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Database DELETE Error]", error);
    return NextResponse.json({ success: false, message: "Failed to delete item" }, { status: 500 });
  }
}
