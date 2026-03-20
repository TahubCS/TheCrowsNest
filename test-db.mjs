import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
  },
});

const tables = [
  "TheCrowsNestUsers",
  "TheCrowsNestClasses",
  "TheCrowsNestMaterials",
  "TheCrowsNestStudyPlans"
];

async function verifyTables() {
  console.log("Verifying DynamoDB Tables...");
  let allGood = true;

  for (const tableName of tables) {
    try {
      const command = new DescribeTableCommand({ TableName: tableName });
      const response = await client.send(command);
      const pk = response.Table.KeySchema.find(k => k.KeyType === "HASH");
      console.log(`[SUCCESS] Table '${tableName}' is Active! Partition Key: ${pk?.AttributeName}`);
    } catch (error) {
      allGood = false;
      console.error(`[ERROR] Could not access table '${tableName}': ${error.message}`);
    }
  }

  if (allGood) {
    console.log("\nAll 4 databases are fully operational!");
  } else {
    console.log("\nSome tables had issues.");
  }
}

verifyTables();
