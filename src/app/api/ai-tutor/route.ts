import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { classId, question } = await request.json();

    if (!classId || !question) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId and question are required." },
        { status: 400 }
      );
    }

    const client = new BedrockAgentRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        ...(process.env.AWS_SESSION_TOKEN && {
          sessionToken: process.env.AWS_SESSION_TOKEN,
        }),
      },
    });

    const knowledgeBaseId = "7PEG1WNUAY";
    
    // We retrieve and generate a response from Bedrock using Claude 3 Haiku
    const command = new RetrieveAndGenerateCommand({
      input: { text: `You are an AI tutor for class ${classId}. Use the provided context to answer the student's question securely. Question: ${question}` },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId,
          modelArn: `arn:aws:bedrock:${process.env.AWS_REGION || "us-east-1"}::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0`
        }
      }
    });

    const response = await client.send(command);
    
    // Extract answer and cited text references
    const answer = response.output?.text || "I was unable to find an answer in the class materials.";
    const citations = response.citations || [];

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Answer generated.",
      data: {
        answer,
        sourcesUsed: citations.length,
        relevanceScores: [],
      },
    });
  } catch (error) {
    console.error("[AI Tutor Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to query the Knowledge Base. Ensure Bedrock model access is enabled in your AWS account." },
      { status: 500 }
    );
  }
}
