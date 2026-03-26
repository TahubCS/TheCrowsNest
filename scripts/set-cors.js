const fs = require('fs');
const path = require('path');
const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");

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

const s3 = new S3Client({ region, credentials });

const corsConfigPath = path.join(__dirname, '..', 'cors-config.json');
const corsConfig = JSON.parse(fs.readFileSync(corsConfigPath, 'utf8'));

async function applyCors() {
  console.log("Applying CORS configuration...");
  try {
    const bucketName = "thecrowsnest";
    await s3.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfig
    }));
    console.log(`✅ CORS configuration applied to bucket ${bucketName}.`);
  } catch (err) {
    console.error(`❌ Error applying CORS configuration:`, err.name, err.message);
  }
}

applyCors();
