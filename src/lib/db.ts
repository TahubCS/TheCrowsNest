/**
 * DynamoDB Client & Operations
 * 
 * Tables:
 * - TheCrowsNestUsers (PK: email)
 * - TheCrowsNestClasses (PK: classId)
 * - TheCrowsNestMaterials (PK: classId, SK: materialId)
 * - TheCrowsNestStudyPlans (PK: planId)
 * - TheCrowsNestRequests (PK: requestId)
 * - TheCrowsNestReports (PK: reportId)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { User, CourseClass, StudyPlan } from "@/types";

// Create DynamoDB client — reads credentials from env vars
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
  },
});

// Document client wraps the raw client with simpler JS-native API
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const USERS_TABLE = "TheCrowsNestUsers";
const CLASSES_TABLE = "TheCrowsNestClasses";
const MATERIALS_TABLE = "TheCrowsNestMaterials";
const STUDY_PLANS_TABLE = "TheCrowsNestStudyPlans";

// ============================================================
// User Operations
// ============================================================

/**
 * Get a user by email (partition key lookup — fast & cheap)
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { email: email.toLowerCase() },
      })
    );

    if (!result.Item) return null;
    return result.Item as User;
  } catch (error) {
    console.error("[DynamoDB Error] getUserByEmail failed:", error);
    throw error; // Re-throw to be handled by the caller (e.g. NextAuth)
  }
}

/**
 * Create a new user in DynamoDB (signup — minimal fields)
 */
export async function createUser(user: User): Promise<void> {
  try {
    await docClient.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          ...user,
          email: user.email.toLowerCase(),
        },
        // Prevent overwriting existing users
        ConditionExpression: "attribute_not_exists(email)",
      })
    );
  } catch (error) {
    console.error("[DynamoDB Error] createUser failed:", error);
    throw error;
  }
}

/**
 * Update user profile (onboarding, class enrollment, etc.)
 */
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
) : Promise<void> {
  const expressionParts: string[] = [];
  const expressionValues: Record<string, unknown> = {};
  const expressionNames: Record<string, string> = {};

  if (updates.level !== undefined) {
    expressionParts.push("#lvl = :level");
    expressionValues[":level"] = updates.level;
    expressionNames["#lvl"] = "level"; // "level" is a reserved word in DynamoDB
  }
  if (updates.name !== undefined) {
    expressionParts.push("#nameAttr = :name");
    expressionValues[":name"] = updates.name;
    expressionNames["#nameAttr"] = "name"; // "name" is also potentially reserved depending on DB version
  }
  if (updates.major !== undefined) {
    expressionParts.push("major = :major");
    expressionValues[":major"] = updates.major;
  }
  if (updates.yearOfStudy !== undefined) {
    expressionParts.push("yearOfStudy = :yearOfStudy");
    expressionValues[":yearOfStudy"] = updates.yearOfStudy;
  }
  if (updates.enrolledClasses !== undefined) {
    expressionParts.push("enrolledClasses = :enrolledClasses");
    expressionValues[":enrolledClasses"] = updates.enrolledClasses;
  }
  if (updates.onboardingComplete !== undefined) {
    expressionParts.push("onboardingComplete = :onboardingComplete");
    expressionValues[":onboardingComplete"] = updates.onboardingComplete;
  }

  if (expressionParts.length === 0) return;

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { email: email.toLowerCase() },
        UpdateExpression: `SET ${expressionParts.join(", ")}`,
        ExpressionAttributeValues: expressionValues,
        ...(Object.keys(expressionNames).length > 0 && {
          ExpressionAttributeNames: expressionNames,
        }),
      })
    );
  } catch (error) {
    console.error("[DynamoDB Error] updateUserProfile failed:", error);
    throw error;
  }
}

/**
 * Add a class to user's enrolled classes
 */
export async function enrollUserInClass(
  email: string,
  classId: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { email: email.toLowerCase() },
      UpdateExpression:
        "SET enrolledClasses = list_append(if_not_exists(enrolledClasses, :emptyList), :newClass)",
      ExpressionAttributeValues: {
        ":newClass": [classId],
        ":emptyList": [],
      },
    })
  );
}

/**
 * Remove a class from user's enrolled classes
 */
export async function unenrollUserFromClass(
  email: string,
  currentClasses: string[],
  classIdToRemove: string
): Promise<void> {
  const updatedClasses = currentClasses.filter((c) => c !== classIdToRemove);
  await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { email: email.toLowerCase() },
      UpdateExpression: "SET enrolledClasses = :classes",
      ExpressionAttributeValues: {
        ":classes": updatedClasses,
      },
    })
  );
}

// ============================================================
// Class Operations
// ============================================================

/**
 * Get a class by classId
 */
export async function getClassById(
  classId: string
): Promise<CourseClass | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: CLASSES_TABLE,
      Key: { classId },
    })
  );

  if (!result.Item) return null;
  return result.Item as CourseClass;
}

/**
 * Get all classes
 */
export async function getAllClasses(): Promise<CourseClass[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: CLASSES_TABLE,
    })
  );

  return (result.Items || []) as CourseClass[];
}

/**
 * Get multiple classes by their IDs
 */
export async function getClassesByIds(
  classIds: string[]
): Promise<CourseClass[]> {
  if (classIds.length === 0) return [];

  // Use individual gets for small lists (more efficient than scan + filter)
  const promises = classIds.map((classId) => getClassById(classId));
  const results = await Promise.all(promises);
  return results.filter((c): c is CourseClass => c !== null);
}

/**
 * Create or update a class (admin/seed use)
 */
export async function putClass(courseClass: CourseClass): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: CLASSES_TABLE,
      Item: courseClass,
    })
  );
}

/**
 * Increment the enrolled count for a class
 */
export async function incrementClassEnrollment(
  classId: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: CLASSES_TABLE,
      Key: { classId },
      UpdateExpression:
        "SET enrolledCount = if_not_exists(enrolledCount, :zero) + :inc",
      ExpressionAttributeValues: {
        ":inc": 1,
        ":zero": 0,
      },
    })
  );
}

/**
 * Decrement the enrolled count for a class
 */
export async function decrementClassEnrollment(
  classId: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: CLASSES_TABLE,
      Key: { classId },
      UpdateExpression:
        "SET enrolledCount = if_not_exists(enrolledCount, :zero) - :dec",
      ExpressionAttributeValues: {
        ":dec": 1,
        ":zero": 0,
      },
    })
  );
}

// ============================================================
// Study Plan Operations
// ============================================================

/**
 * Get all study plans for a user
 */
export async function getStudyPlansByEmail(userEmail: string): Promise<StudyPlan[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: STUDY_PLANS_TABLE,
      FilterExpression: "userEmail = :email",
      ExpressionAttributeValues: {
        ":email": userEmail.toLowerCase(),
      },
    })
  );

  return (result.Items || []) as StudyPlan[];
}

/**
 * Create or update a study plan
 */
export async function createStudyPlan(plan: StudyPlan): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: STUDY_PLANS_TABLE,
      Item: {
        ...plan,
        userEmail: plan.userEmail.toLowerCase(),
      },
    })
  );
}

/**
 * Delete a study plan
 */
export async function deleteStudyPlan(planId: string): Promise<void> {
  const { DeleteCommand } = await import("@aws-sdk/lib-dynamodb");
  await docClient.send(
    new DeleteCommand({
      TableName: STUDY_PLANS_TABLE,
      Key: { planId },
    })
  );
}

// Re-export for backwards compatibility
export { QueryCommand, ScanCommand };

// ============================================================
// Materials Operations
// ============================================================

import type { Material } from "@/types";

/**
 * Save material metadata after successful S3 upload
 */
export async function createMaterial(material: Material): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: MATERIALS_TABLE,
      Item: material,
    })
  );
}

/**
 * Update material processing status
 */
export async function updateMaterialStatus(classId: string, materialId: string, status: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: MATERIALS_TABLE,
      Key: { classId, materialId },
      UpdateExpression: "SET #st = :status",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":status": status,
      },
    })
  );
}

/**
 * Get a single material
 */
export async function getMaterial(classId: string, materialId: string): Promise<Material | null> {
  const { GetCommand } = await import("@aws-sdk/lib-dynamodb");
  const result = await docClient.send(
    new GetCommand({
      TableName: MATERIALS_TABLE,
      Key: { classId, materialId },
    })
  );
  return (result.Item as Material) || null;
}

/**
 * Get all materials for a class
 */
export async function getMaterialsByClassId(classId: string): Promise<Material[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: MATERIALS_TABLE,
      FilterExpression: "classId = :classId",
      ExpressionAttributeValues: {
        ":classId": classId,
      },
    })
  );
  return (result.Items || []) as Material[];
}

/**
 * Get all materials uploaded by a specific user across all classes
 */
export async function getMaterialsByUserEmail(userEmail: string): Promise<Material[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: MATERIALS_TABLE,
      FilterExpression: "uploadedBy = :email",
      ExpressionAttributeValues: {
        ":email": userEmail.toLowerCase(),
      },
    })
  );
  return (result.Items || []) as Material[];
}

/**
 * Delete a material record (does not delete from S3)
 */
export async function deleteMaterial(classId: string, materialId: string): Promise<void> {
  const { DeleteCommand } = await import("@aws-sdk/lib-dynamodb");
  await docClient.send(
    new DeleteCommand({
      TableName: MATERIALS_TABLE,
      Key: { classId, materialId },
    })
  );
}

/**
 * Get all materials with PENDING_REVIEW status (admin use — cross-class scan)
 */
export async function getAllPendingMaterials(): Promise<Material[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: MATERIALS_TABLE,
      FilterExpression: "#st = :status",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":status": "PENDING_REVIEW",
      },
    })
  );
  return (result.Items || []) as Material[];
}

/**
 * Update material status with optional rejection reason
 */
export async function updateMaterialWithRejection(
  classId: string,
  materialId: string,
  status: string,
  rejectionReason?: string,
  expiresAt?: number
): Promise<void> {
  const expressionParts = ["#st = :status"];
  const expressionValues: Record<string, unknown> = { ":status": status };

  if (rejectionReason) {
    expressionParts.push("rejectionReason = :reason");
    expressionValues[":reason"] = rejectionReason;
  }

  if (expiresAt) {
    expressionParts.push("expiresAt = :expiresAt");
    expressionValues[":expiresAt"] = expiresAt;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: MATERIALS_TABLE,
      Key: { classId, materialId },
      UpdateExpression: `SET ${expressionParts.join(", ")}`,
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: expressionValues,
    })
  );
}

// ============================================================
// Class Request Operations
// ============================================================

import type { ClassRequest, Report } from "@/types";

const REQUESTS_TABLE = "TheCrowsNestRequests";
const REPORTS_TABLE = "TheCrowsNestReports";

/**
 * Create a new class request
 */
export async function createClassRequest(request: ClassRequest): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: REQUESTS_TABLE,
      Item: {
        ...request,
        userEmail: request.userEmail.toLowerCase(),
      },
    })
  );
}

/**
 * Get all class requests for a specific user
 */
export async function getRequestsByEmail(userEmail: string): Promise<ClassRequest[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: REQUESTS_TABLE,
      FilterExpression: "userEmail = :email",
      ExpressionAttributeValues: {
        ":email": userEmail.toLowerCase(),
      },
    })
  );
  return (result.Items || []) as ClassRequest[];
}

/**
 * Get ALL class requests (admin use)
 */
export async function getAllRequests(): Promise<ClassRequest[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: REQUESTS_TABLE,
    })
  );
  return (result.Items || []) as ClassRequest[];
}

/**
 * Update a class request's status (admin approve/reject)
 */
export async function updateRequestStatus(
  requestId: string,
  status: "APPROVED" | "REJECTED",
  adminNote?: string
): Promise<void> {
  const expressionParts: string[] = ["#st = :status", "updatedAt = :updatedAt"];
  const expressionValues: Record<string, unknown> = {
    ":status": status,
    ":updatedAt": new Date().toISOString(),
  };

  if (adminNote) {
    expressionParts.push("adminNote = :adminNote");
    expressionValues[":adminNote"] = adminNote;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: REQUESTS_TABLE,
      Key: { requestId },
      UpdateExpression: `SET ${expressionParts.join(", ")}`,
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: expressionValues,
    })
  );
}

// ============================================================
// Report Operations
// ============================================================

/**
 * Create a new report
 */
export async function createReport(report: Report): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: REPORTS_TABLE,
      Item: {
        ...report,
        reportedBy: report.reportedBy.toLowerCase(),
      },
    })
  );
}

/**
 * Get ALL reports (admin use)
 */
export async function getAllReports(): Promise<Report[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: REPORTS_TABLE,
    })
  );
  return (result.Items || []) as Report[];
}

/**
 * Update a report's status (admin review/dismiss)
 */
export async function updateReportStatus(
  reportId: string,
  status: "REVIEWED" | "DISMISSED"
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: REPORTS_TABLE,
      Key: { reportId },
      UpdateExpression: "SET #st = :status, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":updatedAt": new Date().toISOString(),
      },
    })
  );
}
