const { BedrockClient, ListFoundationModelsCommand } = require('@aws-sdk/client-bedrock');
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
const client = new BedrockClient({
  region: env.AWS_REGION || 'us-east-1',
  credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
});
(async () => {
    try {
        const command = new ListFoundationModelsCommand({});
        const response = await client.send(command);
        const anthropicModels = response.modelSummaries.filter(m => m.providerName === 'Anthropic');
        console.log('Available Anthropic Models in Bedrock:');
        anthropicModels.forEach(m => console.log(m.modelId));
    } catch (e) {
        console.error(e);
    }
})();
