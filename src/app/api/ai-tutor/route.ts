import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { BedrockAgentRuntimeClient, RetrieveCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
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

    const clientAgent = new BedrockAgentRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        ...(process.env.AWS_SESSION_TOKEN && {
          sessionToken: process.env.AWS_SESSION_TOKEN,
        }),
      },
    });

    const clientRuntime = new BedrockRuntimeClient({
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

    // Step 1: Retrieve context from Knowledge Base
    const retrieveCommand = new RetrieveCommand({
      knowledgeBaseId,
      retrievalQuery: { text: `Class ${classId}: ${question}` },
      retrievalConfiguration: {
        vectorSearchConfiguration: { numberOfResults: 5 }
      }
    });

    const retrieveResponse = await clientAgent.send(retrieveCommand);
    const contextResults = retrieveResponse.retrievalResults || [];
    const contextTexts = contextResults.map(r => r.content?.text).filter(Boolean).join("\n\n---\n\n");

    // Step 2: Generate response using Claude 4.6 Sonnet
    const systemPrompt = `You are an AI tutor exclusively for class ${classId}. Use ONLY the provided context to answer the student's question securely. Do not make up answers outside the syllabus context.`;
    const userPrompt = `Context:\n<context>\n${contextTexts}\n</context>\n\nQuestion: ${question}`;

    const converseCommand = new ConverseCommand({
      modelId: "us.anthropic.claude-opus-4-20250514-v1:0",
      system: [{ text: systemPrompt }],
      messages: [{ role: "user", content: [{ text: userPrompt }] }]
    });

    const response = await clientRuntime.send(converseCommand);

    // Extract answer and cited text references
    const answer = response.output?.message?.content?.[0]?.text || "I was unable to find an answer in the class materials.";
    const citationsCount = contextResults.length;

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Answer generated.",
      data: {
        answer,
        sourcesUsed: citationsCount,
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
