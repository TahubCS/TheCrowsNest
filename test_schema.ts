import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import 'dotenv/config';

async function describe() {
  const client = new DynamoDBClient({ region: "us-east-1" });
  try {
    const data = await client.send(new DescribeTableCommand({ TableName: "TheCrowsNestMaterials" }));
    console.log("SCHEMA:", JSON.stringify(data.Table?.KeySchema));
  } catch (e) {
    console.error(e);
  }
}
describe();
