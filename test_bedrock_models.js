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
    sessionToken: env.AWS_SESSION_TOKEN || undefined,
  },
});

const modelsToTest = [
  'anthropic.claude-3-haiku-20240307-v1:0',
  'anthropic.claude-3-sonnet-20240229-v1:0',
  'anthropic.claude-v2:1',
  'anthropic.claude-instant-v1',
  'amazon.titan-text-express-v1',
];

async function testModels() {
  for (const model of modelsToTest) {
    try {
      console.log(`Testing model: ${model}...`);
      const command = new RetrieveAndGenerateCommand({
        input: { text: "Hello" },
        retrieveAndGenerateConfiguration: {
          type: "KNOWLEDGE_BASE",
          knowledgeBaseConfiguration: {
            knowledgeBaseId: "7PEG1WNUAY",
            modelArn: `arn:aws:bedrock:${env.AWS_REGION || 'us-east-1'}::foundation-model/${model}`
          }
        }
      });
      await client.send(command);
      console.log(`✅ SUCCESS: Model ${model} is enabled and works!`);
      break; 
    } catch (e) {
      console.log(`❌ FAILED: ${model} - Error: ${e.message}`);
    }
  }
}

testModels();
