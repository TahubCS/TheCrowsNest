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

    const { classId, topic, count, style } = await request.json();

    if (!classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId is required." },
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
      retrievalQuery: { text: `Flashcards for ${classId} topic: ${topic || "general course concepts"}` },
      retrievalConfiguration: {
        vectorSearchConfiguration: { numberOfResults: 5 }
      }
    });

    const retrieveResponse = await clientAgent.send(retrieveCommand);
    const contextResults = retrieveResponse.retrievalResults || [];
    const contextTexts = contextResults.map(r => r.content?.text).filter(Boolean).join("\n\n---\n\n");

    const promptText = `Generate precisely ${count || 20} flashcards for class ${classId}.
Context from class materials:
<context>
${contextTexts}
</context>

Topic: ${topic || "Key core concepts"}
Style: ${style || "Concepts"}

CRITICAL INSTRUCTION: Analyze the syllabus context carefully and extract the most important information.
RETURN ONLY A VALID JSON ARRAY. NO MARKDOWN, NO OTHER TEXT. 
Format exactly like this strictly:
[
  { "front": "question", "back": "answer" }
]`;

    const converseCommand = new ConverseCommand({
      modelId: "us.anthropic.claude-3-5-sonnet-20240620-v1:0",
      messages: [{ role: "user", content: [{ text: promptText }] }]
    });

    const response = await clientRuntime.send(converseCommand);
    let answerText = response.output?.message?.content?.[0]?.text || "[]";
    const citationsCount = contextResults.length;

    // Try to strip Markdown blocks just in case the AI hallucinates them despite instructions
    answerText = answerText.trim();
    if (answerText.startsWith("\`\`\`json")) {
      answerText = answerText.substring(7);
    }
    if (answerText.startsWith("\`\`\`")) {
      answerText = answerText.substring(3);
    }
    if (answerText.endsWith("\`\`\`")) {
      answerText = answerText.substring(0, answerText.length - 3);
    }
    answerText = answerText.trim();

    let flashcards = [];
    try {
      flashcards = JSON.parse(answerText);
      if (!Array.isArray(flashcards)) {
        throw new Error("Parsed JSON is not an array");
      }
    } catch (parseErr) {
      console.error("[Flashcards Parse Error]", parseErr, "Raw Text:", answerText);
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Failed to generate valid flashcards format from course materials." },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Flashcards generated.",
      data: {
        flashcards
      },
    });
  } catch (error) {
    console.error("[Flashcards Generation Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to query the Knowledge Base. Ensure Bedrock model access is enabled." },
      { status: 500 }
    );
  }
}
