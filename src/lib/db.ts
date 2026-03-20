/**
 * DynamoDB Client & User Operations
 * 
 * Table: TheCrowsNestUsers
 * Partition Key: email (String)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import type { User } from "@/types";

// Create DynamoDB client — reads credentials from env vars
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Document client wraps the raw client with simpler JS-native API
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const TABLE_NAME = "TheCrowsNestUsers";

/**
 * Get a user by email (partition key lookup — fast & cheap)
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { email: email.toLowerCase() },
    })
  );

  if (!result.Item) return null;

  return result.Item as User;
}

/**
 * Create a new user in DynamoDB
 */
export async function createUser(user: User): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...user,
        email: user.email.toLowerCase(),
      },
      // Prevent overwriting existing users
      ConditionExpression: "attribute_not_exists(email)",
    })
  );
}
