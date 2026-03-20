const envLocal = require('fs').readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1].trim()] = val;
  }
});
const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
const client = new BedrockAgentRuntimeClient({
  region: env.AWS_REGION || 'us-east-1',
  credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
});
const models = ['anthropic.claude-v2', 'anthropic.claude-3-haiku-20240307-v1:0'];
(async () => {
  for (const m of models) {
    try {
      await client.send(new RetrieveAndGenerateCommand({
        input: { text: 'hi' },
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: { knowledgeBaseId: '7PEG1WNUAY', modelArn: rn:aws:bedrock: + env.AWS_REGION + ::foundation-model/ + m }
        }
      }));
      console.log(m + ' OK');
    } catch (e) {
      console.log(m + ' ERR: ' + e.name + ' ' + e.message.substring(0, 100));
    }
  }
})();
