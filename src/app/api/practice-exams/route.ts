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

    const { classId, topic, difficulty, format } = await request.json();

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
    
    // Strict prompt for multiple choice questions
    const numQuestions = format === "Short Quiz" ? 5 : 10;
    
    const prompt = `You are an expert professor writing a practice exam for your students.
Topic focus: ${topic || "All Course Topics"}
Difficulty level: ${difficulty || "Standard"}
Format: ${format || "Multiple Choice"}

Using ONLY the provided class materials in your knowledge base, generate exactly ${numQuestions} multiple-choice questions.
CRITICAL INSTRUCTIONS:
1. You MUST return ONLY a raw JSON array of objects.
2. Do NOT use markdown code blocks (e.g. no \`\`\`json).
3. Do NOT include any conversational text before or after the JSON.
4. Each object must have exactly these keys: "question", "options" (an array of exactly 4 strings), and "correctAnswer" (which must exactly match one of the options).

Example format:
[
  {
    "question": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correctAnswer": "Paris"
  }
]`;

    const command = new RetrieveAndGenerateCommand({
      input: { text: prompt },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId,
          modelArn: `arn:aws:bedrock:${process.env.AWS_REGION || "us-east-1"}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`
        }
      }
    });

    const response = await client.send(command);
    let answerText = response.output?.text || "[]";
    
    // Try to strip Markdown blocks
    answerText = answerText.trim();
    if (answerText.startsWith("\`\`\`json")) answerText = answerText.substring(7);
    if (answerText.startsWith("\`\`\`")) answerText = answerText.substring(3);
    if (answerText.endsWith("\`\`\`")) answerText = answerText.substring(0, answerText.length - 3);
    answerText = answerText.trim();

    let questions = [];
    try {
      questions = JSON.parse(answerText);
      if (!Array.isArray(questions)) {
        throw new Error("Parsed JSON is not an array");
      }
    } catch (parseErr) {
      console.error("[Exam Parse Error]", parseErr, "Raw Text:", answerText);
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Failed to generate a valid exam format from course materials." },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Exam generated.",
      data: {
        questions
      },
    });
  } catch (error) {
    console.error("[Exam Generation Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to query the Knowledge Base. Ensure Bedrock model access is enabled." },
      { status: 500 }
    );
  }
}
