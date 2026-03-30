const fs = require('fs');
const path = require('path');
const { DynamoDBClient, CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { S3Client, CreateBucketCommand } = require("@aws-sdk/client-s3");

// Manually parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || '';
      // Remove quotes
      value = value.replace(/^(['"])(.*)\1$/, '$2');
      process.env[key] = value;
    }
  });
}

const region = process.env.AWS_REGION || "us-east-1";

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
};

const dynamodb = new DynamoDBClient({ region, credentials });
const s3 = new S3Client({ region, credentials });

const tables = [
  {
    TableName: "TheCrowsNestUsers",
    AttributeDefinitions: [{ AttributeName: "email", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "TheCrowsNestClasses",
    AttributeDefinitions: [{ AttributeName: "classId", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "classId", KeyType: "HASH" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "TheCrowsNestMaterials",
    AttributeDefinitions: [
      { AttributeName: "classId", AttributeType: "S" },
      { AttributeName: "materialId", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "classId", KeyType: "HASH" },
      { AttributeName: "materialId", KeyType: "RANGE" }
    ],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "TheCrowsNestStudyPlans",
    AttributeDefinitions: [{ AttributeName: "planId", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "planId", KeyType: "HASH" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "TheCrowsNestRequests",
    AttributeDefinitions: [{ AttributeName: "requestId", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "requestId", KeyType: "HASH" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "TheCrowsNestReports",
    AttributeDefinitions: [{ AttributeName: "reportId", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "reportId", KeyType: "HASH" }],
    BillingMode: "PAY_PER_REQUEST",
  }
];

async function setup() {
  console.log("Setting up DynamoDB Tables...");
  for (const table of tables) {
    try {
      await dynamodb.send(new CreateTableCommand(table));
      console.log(`✅ Table ${table.TableName} created.`);
    } catch (err) {
      if (err.name === "ResourceInUseException") {
        console.log(`ℹ️  Table ${table.TableName} already exists.`);
      } else {
        console.error(`❌ Error creating table ${table.TableName}:`, err.name, err.message);
      }
    }
  }

  console.log("\nSetting up S3 Bucket...");
  try {
    const bucketName = "thecrowsnest";
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
    console.log(`✅ Bucket ${bucketName} created.`);
  } catch (err) {
    if (err.name === "BucketAlreadyExists" || err.name === "BucketAlreadyOwnedByYou") {
      console.log(`ℹ️  Bucket thecrowsnest already exists or owned by you.`);
    } else {
      console.error(`❌ Error creating bucket:`, err.name, err.message);
    }
  }
}

setup().catch(console.error);
