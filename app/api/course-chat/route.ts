export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getGenerationModel } from "@/lib/ai-provider";
import {
  buildCourseContextBlock,
  getCourseSnapshotByCourseId,
  queryCourseRag,
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

    const { courseId, question, conversationId } = await req.json();

    if (!courseId || !question?.trim()) {
      return NextResponse.json(
        { error: "courseId and question are required" },
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
        "course",
        courseId,
        undefined,
        `Course: ${courseId}`,
      );
    }

    // Save user message
    await saveChatMessage(
      chatConversationId,
      "user",
      question,
    );

    const snapshot = await getCourseSnapshotByCourseId(courseId);

    if (!snapshot) {
      const errorMessage =
        "I could not find that course record yet. Please regenerate the course or upload topic data, then ask again.";
      
      await saveChatMessage(
        chatConversationId,
        "assistant",
        errorMessage,
      );

      return NextResponse.json({
        answer: errorMessage,
        conversationId: chatConversationId,
        needUpload: true,
        namespace: null,
        sources: [],
        pineconeAvailable: false,
      });
    }

    const ragResult = await queryCourseRag({
      topicName: snapshot.topicName,
      question,
      topK: 6,
    });

    const contextBlock = buildCourseContextBlock(snapshot, ragResult.matches);

    const model = getGenerationModel({
      provider: "local-ai",
      temperature: 0.2,
      model: "mistral:latest",
    });

    const prompt = `You are a helpful course tutor inside an AI video course app.
Answer using only the course context below.
If the context is not enough, say you do not have enough course information.
Keep the answer concise, practical, and friendly.
Format your response exactly like this:
Summary: <1-2 lines>
Key Points:
- <point 1>
- <point 2>
- <point 3 if needed>
Next Step: <single actionable suggestion>

COURSE CONTEXT:
${contextBlock}

USER QUESTION:
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
      answer,
      conversationId: chatConversationId,
      namespace: ragResult.namespace,
      sources: ragResult.matches.map((match) => match.metadata || {}),
      pineconeAvailable: ragResult.pineconeAvailable,
    });
  } catch (error) {
    console.error("Course chat error:", error);
    return NextResponse.json(
      { error: "Failed to answer course question" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/course-chat?conversationId=xxx
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
