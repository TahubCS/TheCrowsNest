require('dotenv').config({ path: '.env.local' });
const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } = require('@aws-sdk/client-bedrock-agent-runtime');

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
  },
});

const command = new RetrieveAndGenerateCommand({
  input: { text: "Are there any files uploaded" },
  retrieveAndGenerateConfiguration: {
    type: "KNOWLEDGE_BASE",
    knowledgeBaseConfiguration: {
      knowledgeBaseId: "7PEG1WNUAY",
      modelArn: rn:aws:bedrock: + (process.env.AWS_REGION || "us-east-1") + ::foundation-model/anthropic.claude-3-haiku-20240307-v1:0
    }
  }
});

client.send(command).then(res => console.log(res)).catch(err => { console.error('BIG FAT ERROR'); console.error(err); });
