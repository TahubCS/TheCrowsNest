const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || '';
      value = value.replace(/^(['"])(.*)\1$/, '$2');
      process.env[key] = value;
    }
  });
}

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

if (process.env.AWS_SESSION_TOKEN) {
    credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
}

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1", credentials });

async function test() {
    const bucket = "thecrowsnest";
    const key = "test-upload.txt";
    console.log("Testing S3 PutObject (Upload permission)...");
    try {
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "test" }));
        console.log("✅ PutObject successful!");
    } catch (e) {
        console.error("❌ PutObject failed:", e.message);
    }

    console.log("\nTesting S3 GetObject (Download permission)...");
    try {
        await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        console.log("✅ GetObject successful!");
    } catch (e) {
        console.error("❌ GetObject failed:", e.message);
    }
}

test();
