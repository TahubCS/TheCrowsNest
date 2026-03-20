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

    const { classId, topic, count, style } = await request.json();

    if (!classId) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "classId is required." },
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
    
    // Strict prompt to return ONLY raw JSON array
    const prompt = `You are an expert AI tutor generating flashcards for a class.
Topic focus: ${topic || "Everything Discussed So Far"}
Requested count: ${count || 20}
Style: ${style || "Concepts"}

Using the provided class materials in your knowledge base, generate exactly ${count || 20} flashcards.
CRITICAL INSTRUCTIONS:
1. You MUST return ONLY a raw JSON array of objects.
2. Do NOT use markdown code blocks (e.g. no \`\`\`json).
3. Do NOT include any conversational text before or after the JSON.
4. Each object must have exactly two keys: "front" and "back".

Example format:
[
  {"front": "What is the mitochondria?", "back": "The powerhouse of the cell."},
  {"front": "Define OS", "back": "Operating System"}
]`;

    const command = new RetrieveAndGenerateCommand({
      input: { text: prompt },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId,
          modelArn: `arn:aws:bedrock:${process.env.AWS_REGION || "us-east-1"}::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0`
        }
      }
    });

    const response = await client.send(command);
    let answerText = response.output?.text || "[]";
    
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
