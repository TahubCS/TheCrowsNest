/**
 * PostgreSQL Client & Operations (Supabase)
 *
 * Tables:
 * - users           (PK: email)
 * - classes         (PK: class_id)
 * - materials       (PK: material_id)
 * - study_plans     (PK: plan_id)
 * - requests        (PK: request_id)
 * - reports         (PK: report_id)
 */

import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import type { User, CourseClass, StudyPlan, Material, ClassRequest, Report, MaterialUploadEvent } from "@/types";

// Global singleton — prevents Turbopack HMR from creating a new connection pool
// on every hot reload (which exhausts the Supabase connection limit).
const g = global as typeof globalThis & { _sql?: ReturnType<typeof postgres> };

function readDatabaseUrlFromEnvLocal(): string | null {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
    if (!match) return null;

    const rawValue = match[1].trim();
    if (
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) {
      return rawValue.slice(1, -1);
    }
    return rawValue;
  } catch {
    return null;
  }
}

function resolveDatabaseUrl(): string {
  const envValue = process.env.DATABASE_URL?.trim();
  const envLocalValue = readDatabaseUrlFromEnvLocal();

  // Prisma can inject a local proxy URL in terminal sessions; prefer the explicit
  // .env.local database URL so auth routes always use the intended Supabase DB.
  if (envValue?.startsWith("prisma+postgres://localhost:")) {
    if (envLocalValue) return envLocalValue;
    throw new Error("DATABASE_URL was overridden by a local Prisma proxy and .env.local DATABASE_URL could not be read.");
  }

  if (envValue) return envValue;
  if (envLocalValue) return envLocalValue;
  throw new Error("DATABASE_URL is not configured.");
}

const databaseUrl = resolveDatabaseUrl();

if (!g._sql) {
  g._sql = postgres(databaseUrl, {
    transform: postgres.camel,
    ssl: "require",
    max: 10,
  });
}

const sql = g._sql;

// ============================================================
// User Operations
// ============================================================

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const rows = await sql<User[]>`
      SELECT * FROM users WHERE email = ${email.toLowerCase()} LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error("[DB Error] getUserByEmail failed:", error);
    throw error;
  }
}

export interface PendingVerification {
  email: string;
  name: string;
  passwordHash: string;
  code?: string;
  verificationCode?: string;
  expiresAt: number;
}

export async function getPendingVerification(email: string): Promise<PendingVerification | null> {
  try {
    const result = await sql<PendingVerification[]>`
      SELECT * FROM pending_verifications WHERE email = ${email} LIMIT 1
    `;
    return result.length ? result[0] : null;
  } catch (error) {
    console.error("[DB Error] getPendingVerification failed:", error);
    return null;
  }
}

export async function deletePendingVerification(email: string): Promise<void> {
  try {
    await sql`DELETE FROM pending_verifications WHERE email = ${email}`;
  } catch (error) {
    console.error("[DB Error] deletePendingVerification failed:", error);
  }
}

export async function savePendingVerification(data: PendingVerification): Promise<void> {
  try {
    await sql`
      INSERT INTO pending_verifications (email, name, password_hash, code, expires_at)
      VALUES (${data.email}, ${data.name}, ${data.passwordHash}, ${data.code ?? null}, ${data.expiresAt})
    `;
  } catch (error) {
    console.error("[DB Error] savePendingVerification failed:", error);
  }
}

export async function createUser(user: User): Promise<void> {
  try {
    const result = await sql`
      INSERT INTO users (email, id, name, password_hash, pirate_id, level, major,
                         year_of_study, enrolled_classes, onboarding_complete, is_admin, created_at)
      VALUES (
        ${user.email.toLowerCase()},
        ${user.id},
        ${user.name},
        ${user.passwordHash},
        ${user.pirateId ?? null},
        ${user.level ?? null},
        ${user.major ?? null},
        ${user.yearOfStudy ?? null},
        ${user.enrolledClasses ?? []},
        ${user.onboardingComplete ?? false},
        ${user.isAdmin ?? false},
        ${user.createdAt ?? new Date().toISOString()}
      )
      ON CONFLICT (email) DO NOTHING
    `;
    if (result.count === 0) {
      const err = new Error("User already exists") as Error & { name: string };
      err.name = "ConditionalCheckFailedException";
      throw err;
    }
  } catch (error) {
    console.error("[DB Error] createUser failed:", error);
    throw error;
  }
}

export async function updateUserProfile(
  email: string,
  updates: {
    level?: string;
    name?: string;
    major?: string;
    yearOfStudy?: string;
    enrolledClasses?: string[];
    onboardingComplete?: boolean;
  }
): Promise<void> {
  const values: Record<string, unknown> = {};
  if (updates.level !== undefined) values["level"] = updates.level;
  if (updates.name !== undefined) values["name"] = updates.name;
  if (updates.major !== undefined) values["major"] = updates.major;
  if (updates.yearOfStudy !== undefined) values["year_of_study"] = updates.yearOfStudy;
  if (updates.enrolledClasses !== undefined) values["enrolled_classes"] = updates.enrolledClasses;
  if (updates.onboardingComplete !== undefined) values["onboarding_complete"] = updates.onboardingComplete;

  if (Object.keys(values).length === 0) return;

  try {
    await sql`
      UPDATE users SET ${sql(values)} WHERE email = ${email.toLowerCase()}
    `;
  } catch (error) {
    console.error("[DB Error] updateUserProfile failed:", error);
    throw error;
  }
}

export async function enrollUserInClass(email: string, classId: string): Promise<void> {
  await sql`
    UPDATE users
    SET enrolled_classes = array_append(
      COALESCE(enrolled_classes, '{}'),
      ${classId}
    )
    WHERE email = ${email.toLowerCase()}
      AND NOT (enrolled_classes @> ARRAY[${classId}])
  `;
}

export async function unenrollUserFromClass(
  email: string,
  currentClasses: string[],
  classIdToRemove: string
): Promise<void> {
  const updatedClasses = currentClasses.filter((c) => c !== classIdToRemove);
  await sql`
    UPDATE users SET enrolled_classes = ${updatedClasses} WHERE email = ${email.toLowerCase()}
  `;
}

// ============================================================
// Class Operations
// ============================================================

export async function getClassById(classId: string): Promise<CourseClass | null> {
  const rows = await sql<CourseClass[]>`
    SELECT * FROM classes WHERE class_id = ${classId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getAllClasses(): Promise<CourseClass[]> {
  return sql<CourseClass[]>`SELECT * FROM classes`;
}

export async function getClassesByIds(classIds: string[]): Promise<CourseClass[]> {
  if (classIds.length === 0) return [];
  return sql<CourseClass[]>`SELECT * FROM classes WHERE class_id = ANY(${classIds})`;
}

export async function putClass(courseClass: CourseClass): Promise<void> {
  await sql`
    INSERT INTO classes (class_id, course_code, course_name, department, credit_hours,
                         description, related_majors, enrolled_count, syllabus)
    VALUES (
      ${courseClass.classId},
      ${courseClass.courseCode},
      ${courseClass.courseName},
      ${courseClass.department},
      ${courseClass.creditHours ?? null},
      ${courseClass.description ?? null},
      ${courseClass.relatedMajors ?? []},
      ${courseClass.enrolledCount ?? 0},
      ${courseClass.syllabus ?? null}
    )
    ON CONFLICT (class_id) DO UPDATE SET
      course_code    = EXCLUDED.course_code,
      course_name    = EXCLUDED.course_name,
      department     = EXCLUDED.department,
      credit_hours   = EXCLUDED.credit_hours,
      description    = EXCLUDED.description,
      related_majors = EXCLUDED.related_majors,
      enrolled_count = EXCLUDED.enrolled_count,
      syllabus       = EXCLUDED.syllabus
  `;
}

export type ClassUpdate = Pick<
  CourseClass,
  "courseName" | "department" | "creditHours" | "description" | "relatedMajors"
> & {
  syllabus?: string | null;
};

export async function updateClass(classId: string, updates: ClassUpdate): Promise<boolean> {
  const result = await sql`
    UPDATE classes
    SET
      course_name    = ${updates.courseName},
      department     = ${updates.department},
      credit_hours   = ${updates.creditHours},
      description    = ${updates.description ?? ""},
      related_majors = ${updates.relatedMajors ?? []},
      syllabus       = ${updates.syllabus ?? null}
    WHERE class_id = ${classId}
  `;

  return result.count > 0;
}

export interface ClassUsageSummary {
  enrolledUsers: number;
  enrolledCount: number;
  materials: number;
  studyPlans: number;
  sharedResources: number;
  personalResources: number;
  examSessions: number;
  reports: number;
  materialUploadEvents: number;
  sharedMaterialCoverage: number;
  activityFeed: number;
}

export function getClassUsageTotal(summary: ClassUsageSummary): number {
  return Object.values(summary).reduce((total, value) => total + value, 0);
}

async function countRows(query: Promise<Array<{ count: number | string }>>): Promise<number> {
  const rows = await query;
  return Number(rows[0]?.count ?? 0);
}

export async function getClassUsageSummary(classId: string): Promise<ClassUsageSummary> {
  const classRows = await sql<Array<{ enrolledCount: number | null }>>`
    SELECT enrolled_count FROM classes WHERE class_id = ${classId} LIMIT 1
  `;

  const [
    enrolledUsers,
    materials,
    studyPlans,
    sharedResources,
    personalResources,
    examSessions,
    reports,
    materialUploadEvents,
    sharedMaterialCoverage,
    activityFeed,
  ] = await Promise.all([
    countRows(sql`SELECT COUNT(*)::int AS count FROM users WHERE enrolled_classes @> ARRAY[${classId}]`),
    countRows(sql`SELECT COUNT(*)::int AS count FROM materials WHERE class_id = ${classId}`),
    countRows(sql`SELECT COUNT(*)::int AS count FROM study_plans WHERE class_id = ${classId}`),
    countRows(sql`SELECT COUNT(*)::int AS count FROM shared_resources WHERE class_id = ${classId}`),
    countRows(sql`SELECT COUNT(*)::int AS count FROM personal_resources WHERE class_id = ${classId}`),
    countRows(sql`SELECT COUNT(*)::int AS count FROM exam_sessions WHERE class_id = ${classId}`),
    countRows(sql`SELECT COUNT(*)::int AS count FROM reports WHERE class_id = ${classId}`),
    countRows(sql`SELECT COUNT(*)::int AS count FROM material_upload_events WHERE class_id = ${classId}`),
    countRows(sql`SELECT COUNT(*)::int AS count FROM shared_material_coverage WHERE class_id = ${classId}`),
    countRows(sql`SELECT COUNT(*)::int AS count FROM user_activity_feed WHERE class_id = ${classId}`),
  ]);

  return {
    enrolledUsers,
    enrolledCount: classRows[0]?.enrolledCount ?? 0,
    materials,
    studyPlans,
    sharedResources,
    personalResources,
    examSessions,
    reports,
    materialUploadEvents,
    sharedMaterialCoverage,
    activityFeed,
  };
}

export async function deleteClassIfUnused(
  classId: string
): Promise<{ deleted: boolean; usage: ClassUsageSummary; exists: boolean }> {
  const existingClass = await getClassById(classId);
  const usage = await getClassUsageSummary(classId);

  if (!existingClass) {
    return { deleted: false, usage, exists: false };
  }

  if (getClassUsageTotal(usage) > 0) {
    return { deleted: false, usage, exists: true };
  }

  const result = await sql`DELETE FROM classes WHERE class_id = ${classId}`;
  return { deleted: result.count > 0, usage, exists: true };
}

export async function incrementClassEnrollment(classId: string): Promise<void> {
  await sql`
    UPDATE classes SET enrolled_count = COALESCE(enrolled_count, 0) + 1 WHERE class_id = ${classId}
  `;
}

export async function decrementClassEnrollment(classId: string): Promise<void> {
  await sql`
    UPDATE classes SET enrolled_count = GREATEST(COALESCE(enrolled_count, 0) - 1, 0) WHERE class_id = ${classId}
  `;
}

// ============================================================
// Study Plan Operations
// ============================================================

function normalizeStudyPlanItems(items: unknown): StudyPlan["items"] {
  if (Array.isArray(items)) return items;

  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

export async function getStudyPlansByEmail(userEmail: string, classId?: string): Promise<StudyPlan[]> {
  const plans = classId
    ? await sql<StudyPlan[]>`
        SELECT * FROM study_plans
        WHERE user_email = ${userEmail.toLowerCase()} AND class_id = ${classId}
      `
    : await sql<StudyPlan[]>`
        SELECT * FROM study_plans
        WHERE user_email = ${userEmail.toLowerCase()}
      `;

  return plans.map((plan) => ({
    ...plan,
    items: normalizeStudyPlanItems(plan.items),
  }));
}

export async function createStudyPlan(plan: StudyPlan): Promise<void> {
  await sql`
    INSERT INTO study_plans (plan_id, class_id, user_email, title, description, items, created_at, updated_at)
    VALUES (
      ${plan.planId},
      ${plan.classId ?? null},
      ${plan.userEmail.toLowerCase()},
      ${plan.title},
      ${plan.description ?? null},
      ${JSON.stringify(plan.items ?? [])},
      ${plan.createdAt ?? new Date().toISOString()},
      ${plan.updatedAt ?? new Date().toISOString()}
    )
    ON CONFLICT (plan_id) DO UPDATE SET
      title       = EXCLUDED.title,
      description = EXCLUDED.description,
      items       = EXCLUDED.items,
      updated_at  = EXCLUDED.updated_at
  `;
}

export async function deleteStudyPlan(planId: string): Promise<void> {
  await sql`DELETE FROM study_plans WHERE plan_id = ${planId}`;
}

export async function getStudyPlanById(planId: string): Promise<StudyPlan | null> {
  const rows = await sql<StudyPlan[]>`
    SELECT * FROM study_plans WHERE plan_id = ${planId} LIMIT 1
  `;
  if (!rows[0]) return null;
  return { ...rows[0], items: normalizeStudyPlanItems(rows[0].items) };
}

export async function updateStudyPlanItemStatus(
  planId: string,
  userEmail: string,
  itemId: string,
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED"
): Promise<void> {
  const plan = await getStudyPlanById(planId);
  if (!plan || plan.userEmail.toLowerCase() !== userEmail.toLowerCase()) {
    throw Object.assign(new Error("Plan not found or access denied"), { code: 404 });
  }

  const updatedItems = plan.items.map((item) =>
    item.itemId === itemId ? { ...item, status } : item
  );

  await sql`
    UPDATE study_plans
    SET items = ${JSON.stringify(updatedItems)}, updated_at = ${new Date().toISOString()}
    WHERE plan_id = ${planId}
  `;
}

// ============================================================
// Materials Operations
// ============================================================

export async function createMaterial(material: Material): Promise<void> {
  await sql`
    INSERT INTO materials (material_id, class_id, file_name, file_type, storage_key, material_type,
                           uploaded_by, uploaded_by_name, status, rejection_reason, expires_at, uploaded_at,
                           file_size_bytes, file_extension, content_hash_sha256, parser_status)
    VALUES (
      ${material.materialId},
      ${material.classId},
      ${material.fileName},
      ${material.fileType},
      ${material.storageKey},
      ${material.materialType},
      ${material.uploadedBy},
      ${material.uploadedByName ?? null},
      ${material.status ?? "PENDING_REVIEW"},
      ${material.rejectionReason ?? null},
      ${material.expiresAt ?? null},
      ${material.uploadedAt ?? new Date().toISOString()},
      ${material.fileSizeBytes ?? null},
      ${material.fileExtension ?? null},
      ${material.contentHashSha256 ?? null},
      ${material.parserStatus ?? null}
    )
  `;
}

export async function updateMaterialStatus(
  classId: string,
  materialId: string,
  status: string
): Promise<void> {
  await sql`
    UPDATE materials SET status = ${status}
    WHERE material_id = ${materialId} AND class_id = ${classId}
  `;
}

export async function getMaterial(classId: string, materialId: string): Promise<Material | null> {
  const rows = await sql<Material[]>`
    SELECT * FROM materials WHERE material_id = ${materialId} AND class_id = ${classId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getMaterialsByClassId(classId: string): Promise<Material[]> {
  return sql<Material[]>`
    SELECT * FROM materials
    WHERE class_id = ${classId}
    ORDER BY uploaded_at DESC
  `;
}

export async function getMaterialsByUserEmail(userEmail: string): Promise<Material[]> {
  return sql<Material[]>`SELECT * FROM materials WHERE uploaded_by = ${userEmail.toLowerCase()}`;
}

export async function deleteMaterial(classId: string, materialId: string): Promise<void> {
  await sql`DELETE FROM materials WHERE material_id = ${materialId} AND class_id = ${classId}`;
}

export async function incrementMaterialPopularity(classId: string, materialIds: string[]): Promise<number> {
  const uniqueMaterialIds = [...new Set(materialIds.filter((id) => typeof id === "string" && id.trim().length > 0))];
  if (uniqueMaterialIds.length === 0) return 0;

  const popularityColumns = await sql<{ columnName: string }[]>`
    SELECT column_name AS "columnName"
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'materials'
      AND column_name IN ('popularity_rating', 'popularity')
  `;

  const popularityColumn =
    popularityColumns.find((column) => column.columnName === "popularity_rating")?.columnName ??
    popularityColumns.find((column) => column.columnName === "popularity")?.columnName;

  if (!popularityColumn) return 0;

  const result = await sql.unsafe(
    `
      UPDATE materials
      SET ${popularityColumn} = COALESCE(${popularityColumn}, 0) + 1
      WHERE class_id = $1
        AND status = 'PROCESSED'
        AND material_id = ANY($2::text[])
    `,
    [classId, uniqueMaterialIds]
  );

  return result.count;
}

export async function getAllPendingMaterials(): Promise<Material[]> {
  return sql<Material[]>`SELECT * FROM materials WHERE status = 'PENDING_REVIEW'`;
}

export async function updateMaterialWithRejection(
  classId: string,
  materialId: string,
  status: string,
  rejectionReason?: string,
  expiresAt?: number
): Promise<void> {
  const values: Record<string, unknown> = { status };
  if (rejectionReason !== undefined) values["rejection_reason"] = rejectionReason;
  if (expiresAt !== undefined) values["expires_at"] = expiresAt;

  await sql`
    UPDATE materials SET ${sql(values)}
    WHERE material_id = ${materialId} AND class_id = ${classId}
  `;
}

/**
 * Persist evaluation metrics and decision from the AI backend.
 * Updates safety/audit columns added in the upload-safety migration.
 */
export async function updateMaterialEvaluation(
  classId: string,
  materialId: string,
  update: {
    status: string;
    rejectionCode?: string;
    rejectionReason?: string;
    aiConfidence?: number;
    extractCharCount?: number;
    pageCount?: number;
    ocrUsed?: boolean;
    ingestionAttempts?: number;
    processedAt?: string;
    failedAt?: string;
    lastError?: string;
    expiresAt?: number;
  }
): Promise<void> {
  const values: Record<string, unknown> = { status: update.status };
  if (update.rejectionCode !== undefined) values["rejection_code"] = update.rejectionCode;
  if (update.rejectionReason !== undefined) values["rejection_reason"] = update.rejectionReason;
  if (update.aiConfidence !== undefined) values["ai_confidence"] = update.aiConfidence;
  if (update.extractCharCount !== undefined) values["extract_char_count"] = update.extractCharCount;
  if (update.pageCount !== undefined) values["page_count"] = update.pageCount;
  if (update.ocrUsed !== undefined) values["ocr_used"] = update.ocrUsed;
  if (update.ingestionAttempts !== undefined) values["ingestion_attempts"] = update.ingestionAttempts;
  if (update.processedAt !== undefined) values["processed_at"] = update.processedAt;
  if (update.failedAt !== undefined) values["failed_at"] = update.failedAt;
  if (update.lastError !== undefined) values["last_error"] = update.lastError;
  if (update.expiresAt !== undefined) values["expires_at"] = update.expiresAt;

  await sql`
    UPDATE materials SET ${sql(values)}
    WHERE material_id = ${materialId} AND class_id = ${classId}
  `;
}

/** Log an event to the material_upload_events audit table */
export async function logMaterialUploadEvent(event: MaterialUploadEvent): Promise<void> {
  await sql`
    INSERT INTO material_upload_events
      (material_id, class_id, user_email, event_type, event_stage, decision, reason_code, reason_text, metrics, created_at)
    VALUES (
      ${event.materialId},
      ${event.classId},
      ${event.userEmail},
      ${event.eventType},
      ${event.eventStage},
      ${event.decision ?? null},
      ${event.reasonCode ?? null},
      ${event.reasonText ?? null},
      ${event.metrics ? JSON.stringify(event.metrics) : null},
      ${event.createdAt ?? new Date().toISOString()}
    )
  `;
}

/** Check for duplicate content hash within a class */
export async function findDuplicateByHash(classId: string, contentHash: string): Promise<Material | null> {
  const rows = await sql<Material[]>`
    SELECT * FROM materials
    WHERE class_id = ${classId}
      AND content_hash_sha256 = ${contentHash}
      AND status != 'REJECTED'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Count recent uploads by a user within a time window (for rate limiting) */
export async function countRecentUploads(userEmail: string, windowMinutes: number): Promise<number> {
  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM material_upload_events
    WHERE user_email = ${userEmail.toLowerCase()}
      AND event_type = 'upload'
      AND created_at > NOW() - ${windowMinutes + ' minutes'}::interval
  `;
  return rows[0]?.count ?? 0;
}

/** Get lightweight status fields for polling */
export async function getMaterialStatus(classId: string, materialId: string): Promise<{
  status: string;
  parserStatus: string | null;
  rejectionCode: string | null;
  rejectionReason: string | null;
  aiConfidence: number | null;
} | null> {
  const rows = await sql<{
    status: string;
    parserStatus: string | null;
    rejectionCode: string | null;
    rejectionReason: string | null;
    aiConfidence: number | null;
  }[]>`
    SELECT status, parser_status, rejection_code, rejection_reason, ai_confidence
    FROM materials
    WHERE material_id = ${materialId} AND class_id = ${classId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Count recent rejections for abuse pattern detection */
export async function countRecentRejections(userEmail: string, windowMinutes: number): Promise<number> {
  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM material_upload_events
    WHERE user_email = ${userEmail.toLowerCase()}
      AND decision = 'REJECTED'
      AND created_at > NOW() - ${windowMinutes + ' minutes'}::interval
  `;
  return rows[0]?.count ?? 0;
}

// ============================================================
// Class Request Operations
// ============================================================

export async function createClassRequest(request: ClassRequest): Promise<void> {
  await sql`
    INSERT INTO requests (request_id, course_code, course_name, department, status,
                          admin_note, user_email, user_name, created_at, updated_at)
    VALUES (
      ${request.requestId},
      ${request.courseCode},
      ${request.courseName},
      ${request.department},
      ${request.status ?? "PENDING"},
      ${request.adminNote ?? null},
      ${request.userEmail.toLowerCase()},
      ${request.userName ?? null},
      ${request.createdAt ?? new Date().toISOString()},
      ${request.updatedAt ?? new Date().toISOString()}
    )
  `;
}

export async function getRequestById(requestId: string): Promise<ClassRequest | null> {
  const rows = await sql<ClassRequest[]>`
    SELECT * FROM requests WHERE request_id = ${requestId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getRequestsByEmail(userEmail: string): Promise<ClassRequest[]> {
  return sql<ClassRequest[]>`
    SELECT * FROM requests WHERE user_email = ${userEmail.toLowerCase()}
  `;
}

export async function getAllRequests(): Promise<ClassRequest[]> {
  return sql<ClassRequest[]>`SELECT * FROM requests`;
}

export async function updateRequestStatus(
  requestId: string,
  status: "APPROVED" | "REJECTED",
  adminNote?: string
): Promise<void> {
  const values: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (adminNote !== undefined) values["admin_note"] = adminNote;

  await sql`UPDATE requests SET ${sql(values)} WHERE request_id = ${requestId}`;
}

// ============================================================
// Report Operations
// ============================================================

export async function createReport(report: Report): Promise<void> {
  await sql`
    INSERT INTO reports (report_id, type, target_id, target_name, class_id, reason, details,
                         status, reported_by, reported_by_name, created_at, updated_at)
    VALUES (
      ${report.reportId},
      ${report.type},
      ${report.targetId},
      ${report.targetName ?? null},
      ${report.classId ?? null},
      ${report.reason},
      ${report.details ?? null},
      ${report.status ?? "PENDING"},
      ${report.reportedBy.toLowerCase()},
      ${report.reportedByName ?? null},
      ${report.createdAt ?? new Date().toISOString()},
      ${report.updatedAt ?? new Date().toISOString()}
    )
  `;
}

export async function getAllReports(): Promise<Report[]> {
  return sql<Report[]>`SELECT * FROM reports`;
}

export async function updateReportStatus(
  reportId: string,
  status: "REVIEWED" | "DISMISSED"
): Promise<void> {
  await sql`
    UPDATE reports SET status = ${status}, updated_at = ${new Date().toISOString()}
    WHERE report_id = ${reportId}
  `;
}

// ============================================================
// Subscription Operations
// ============================================================

export async function updateUserSubscription(
  email: string,
  update: {
    subscriptionPlan: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    planExpiresAt?: string | null;
  }
): Promise<void> {
  const values: Record<string, unknown> = {
    subscription_plan: update.subscriptionPlan,
  };
  if (update.stripeCustomerId !== undefined) values["stripe_customer_id"] = update.stripeCustomerId;
  if (update.stripeSubscriptionId !== undefined) values["stripe_subscription_id"] = update.stripeSubscriptionId;
  if (update.planExpiresAt !== undefined) values["plan_expires_at"] = update.planExpiresAt;

  await sql`UPDATE users SET ${sql(values)} WHERE email = ${email.toLowerCase()}`;
}

export async function updateUserDevMode(
  email: string,
  plan: "free" | "premium" | null
): Promise<void> {
  await sql`
    UPDATE users SET dev_mode_plan = ${plan} WHERE email = ${email.toLowerCase()}
  `;
}

// ============================================================
// Activity Feed
// ============================================================

export type ActivityEventType = "upload" | "flashcards" | "exam" | "study_plan";

export interface ActivityEvent {
  userEmail: string;
  firstName: string;
  eventType: ActivityEventType;
  description: string;
  fileName?: string;
  classId?: string;
  courseCode?: string;
  resourceType?: string;
}

export async function getMaterialByFileName(classId: string, fileName: string): Promise<Material | null> {
  try {
    const rows = await sql<Material[]>`
      SELECT * FROM materials
      WHERE class_id = ${classId} AND file_name = ${fileName}
      ORDER BY uploaded_at DESC
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error("[DB Error] getMaterialByFileName failed:", error);
    throw error;
  }
}

export async function logActivityEvent(event: ActivityEvent): Promise<void> {
  try {
    await sql`
      INSERT INTO user_activity_feed
        (user_email, first_name, event_type, description, file_name, class_id, course_code, resource_type)
      VALUES (
        ${event.userEmail.toLowerCase()},
        ${event.firstName},
        ${event.eventType},
        ${event.description},
        ${event.fileName ?? null},
        ${event.classId ?? null},
        ${event.courseCode ?? null},
        ${event.resourceType ?? null}
      )
    `;
  } catch (err) {
    // Best-effort — never let activity logging break the main operation
    console.error("[Activity Feed ERROR] Failed to log event:", err);
  }
}

