/**
 * DynamoDB Client & Operations
 * 
 * Tables:
 * - TheCrowsNestUsers (PK: email)
 * - TheCrowsNestClasses (PK: classId)
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
import type { User, CourseClass } from "@/types";

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
  const result = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { email: email.toLowerCase() },
    })
  );

  if (!result.Item) return null;
  return result.Item as User;
}

/**
 * Create a new user in DynamoDB (signup — minimal fields)
 */
export async function createUser(user: User): Promise<void> {
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
}

/**
 * Update user profile (onboarding, class enrollment, etc.)
 */
export async function updateUserProfile(
  email: string,
  updates: {
    level?: string;
    major?: string;
    yearOfStudy?: string;
    enrolledClasses?: string[];
    onboardingComplete?: boolean;
  }
): Promise<void> {
  const expressionParts: string[] = [];
  const expressionValues: Record<string, unknown> = {};
  const expressionNames: Record<string, string> = {};

  if (updates.level !== undefined) {
    expressionParts.push("#lvl = :level");
    expressionValues[":level"] = updates.level;
    expressionNames["#lvl"] = "level"; // "level" is a reserved word in DynamoDB
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

// Re-export for backwards compatibility
export { QueryCommand, ScanCommand };
