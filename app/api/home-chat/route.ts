export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { getGenerationModel } from "@/lib/ai-provider";
import {
  buildTopicContextFromMatches,
  queryTopicRecords,
} from "@/lib/course-rag";
import {
  saveChatMessage,
  createConversation,
  getConversationMessages,
  generateConversationId,
} from "@/lib/chat-persistence";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicName, question, conversationId } = await req.json();

    if (!topicName?.trim() || !question?.trim()) {
      return NextResponse.json(
        { error: "topicName and question are required" },
        { status: 400 },
      );
    }

    // Use provided conversationId or create new one
    const chatConversationId =
      conversationId || generateConversationId();

    // Create conversation if it's new
    if (!conversationId) {
      await createConversation(
        chatConversationId,
        userId,
        "home",
        undefined,
        topicName.trim(),
        `Topic: ${topicName}`,
      );
    }

    // Save user message
    await saveChatMessage(
      chatConversationId,
      "user",
      question,
    );

    const ragResult = await queryTopicRecords({
      topicName: topicName.trim(),
      question: question.trim(),
      topK: 8,
    });

    if (!ragResult.matches.length) {
      const errorMessage =
        "I could not find records for this topic yet. Please upload a PDF so I can learn this topic first.";
      
      await saveChatMessage(
        chatConversationId,
        "assistant",
        errorMessage,
      );

      return NextResponse.json({
        answer: errorMessage,
        conversationId: chatConversationId,
        needUpload: true,
        namespace: ragResult.namespace,
        pineconeAvailable: ragResult.pineconeAvailable,
      });
    }

    const context = buildTopicContextFromMatches(ragResult.matches);

    const model = getGenerationModel({
      provider: "local-ai",
      temperature: 0.2,
      model: "mistral:latest",
    });

    const prompt = `You are a helpful tutor. Answer only using the context.
If context is insufficient, explicitly say so.
Keep answers concise and practical.
Format your response exactly like this:
Summary: <1-2 lines>
Key Points:
- <point 1>
- <point 2>
- <point 3 if needed>
Next Step: <single actionable suggestion>

TOPIC:
${topicName}

CONTEXT:
${context}

QUESTION:
${question}

ANSWER:`;

    const response = await model.generateContent(prompt);
    const answer = response.response.text();

    // Save assistant response
    await saveChatMessage(
      chatConversationId,
      "assistant",
      answer,
      ragResult.matches.map((match) => match.metadata || {}),
      { namespace: ragResult.namespace, pineconeAvailable: ragResult.pineconeAvailable },
    );

    return NextResponse.json({
      answer: answer,
      conversationId: chatConversationId,
      needUpload: false,
      namespace: ragResult.namespace,
      sources: ragResult.matches.map((match) => match.metadata || {}),
      pineconeAvailable: ragResult.pineconeAvailable,
    });
  } catch (error) {
    console.error("Home chat error:", error);
    return NextResponse.json(
      { error: "Failed to process home chat query" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/home-chat?conversationId=xxx
 * Retrieve chat history for a conversation
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    const messages = await getConversationMessages(conversationId);

    return NextResponse.json({
      conversationId,
      messages,
    });
  } catch (error) {
    console.error("Failed to get conversation:", error);
    return NextResponse.json(
      { error: "Failed to retrieve conversation" },
      { status: 500 },
    );
  }
}
