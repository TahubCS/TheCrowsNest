/**
 * POST /api/admin/storage/cleanup
 *
 * Lists every file in the Supabase Storage bucket, cross-references against
 * the materials table, and deletes any file that has no matching storage_key.
 *
 * ?dry=true  → report only, nothing deleted
 * Admin-only.
 * 
 * // Dry run first — just shows what would be deleted
 * fetch('/api/admin/storage/cleanup?dry=true', {method:'POST'})
 *    .then(r => r.json()).then(console.log)
 * 
 * // Then delete for real
 * fetch('/api/admin/storage/cleanup', {method:'POST'})
 *    .then(r => r.json()).then(console.log)  
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";

// isAdmin is now imported from @/lib/admin (DB-backed)

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 403 }
    );
  }

  const dry = request.nextUrl.searchParams.get("dry") === "true";

  try {
    // 1. Recursively list all files in the bucket.
    //    Supabase list("") returns top-level items which are folder prefixes when
    //    files are stored under paths like classId/filename. We walk each prefix.
    async function listAllFiles(prefix: string): Promise<string[]> {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(prefix, { limit: 1000, offset: 0 });

      if (error) throw new Error(`Bucket list error (prefix="${prefix}"): ${error.message}`);
      if (!data || data.length === 0) return [];

      const files: string[] = [];
      for (const item of data) {
        if (!item.name) continue;
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        // Items with no id are folder placeholders — recurse into them
        if (!item.id) {
          files.push(...await listAllFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      }
      return files;
    }

    const bucketFiles = await listAllFiles("");

    // 2. Get all storage_keys currently tracked in the DB
    const { data: dbRows, error: dbError } = await supabase
      .from("materials")
      .select("storage_key")
      .not("storage_key", "is", null);

    if (dbError) {
      throw new Error(`DB query error: ${dbError.message}`);
    }

    const knownKeys = new Set((dbRows ?? []).map((r: { storage_key: string }) => r.storage_key));

    // 3. Find orphans (in bucket but not in DB)
    const orphans = bucketFiles.filter((name) => !knownKeys.has(name));

    if (orphans.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No orphaned files found. Bucket is clean ✅",
        data: { bucketTotal: bucketFiles.length, dbTotal: knownKeys.size, orphans: [] },
      });
    }

    if (dry) {
      return NextResponse.json({
        success: true,
        message: `Dry run — ${orphans.length} orphaned file(s) found (nothing deleted).`,
        data: { bucketTotal: bucketFiles.length, dbTotal: knownKeys.size, orphans },
      });
    }

    // 4. Delete orphans
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(orphans);

    if (deleteError) {
      throw new Error(`Delete error: ${deleteError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${orphans.length} orphaned file(s) from the bucket ✅`,
      data: { bucketTotal: bucketFiles.length, dbTotal: knownKeys.size, deleted: orphans },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Storage Cleanup Error]", message);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}


