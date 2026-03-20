const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1].trim()] = val;
  }
});

const client = new BedrockAgentRuntimeClient({
  region: env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sessionToken: env.AWS_SESSION_TOKEN,
  },
});

async function run() {
  try {
    const command = new RetrieveAndGenerateCommand({
      input: { text: "Hello" },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: "7PEG1WNUAY",
          modelArn: `arn:aws:bedrock:${env.AWS_REGION}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`
        }
      }
    });
    console.log("Sending command...");
    await client.send(command);
    console.log("SUCCESS!");
  } catch (e) {
    console.log("MSG1: ", e.message.substring(0, 50));
    console.log("MSG2: ", e.message.substring(50, 100));
    console.log("MSG3: ", e.message.substring(100, 150));
    console.log("MSG4: ", e.message.substring(150, 200));
  }
}

run();
