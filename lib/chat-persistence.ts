import { db } from "@/config/db";
import { chatConversations, chatMessages } from "@/config/schema";
import { eq, and, desc } from "drizzle-orm";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: any;
  metadata?: any;
}

/**
 * Create a new chat conversation
 */
export async function createConversation(
  conversationId: string,
  userId: string,
  chatType: "course" | "home",
  courseId?: string,
  topicName?: string,
  title?: string,
) {
  try {
    await db.insert(chatConversations).values({
      id: conversationId,
      userId,
      courseId: courseId || null,
      topicName: topicName || null,
      chatType,
      title: title || `${chatType} chat - ${new Date().toLocaleString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    throw error;
  }
}

/**
 * Save a chat message to the database
 */
export async function saveChatMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  sources?: any,
  metadata?: any,
) {
  try {
    const result = await db
      .insert(chatMessages)
      .values({
        conversationId,
        role,
        content,
        sources: sources || null,
        metadata: metadata || null,
        createdAt: new Date(),
      })
      .returning();

    // Update conversation's updatedAt timestamp
    await db
      .update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, conversationId));

    return result[0];
  } catch (error) {
    console.error("Failed to save chat message:", error);
    throw error;
  }
}

/**
 * Get all messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  try {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);

    return messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
      sources: msg.sources,
      metadata: msg.metadata,
    }));
  } catch (error) {
    console.error("Failed to get conversation messages:", error);
    throw error;
  }
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  userId: string,
  limit: number = 20,
) {
  try {
    const conversations = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, userId))
      .orderBy(desc(chatConversations.updatedAt))
      .limit(limit);

    return conversations;
  } catch (error) {
    console.error("Failed to get user conversations:", error);
    throw error;
  }
}

/**
 * Get conversations for a specific course
 */
export async function getCourseConversations(
  userId: string,
  courseId: string,
) {
  try {
    const conversations = await db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.courseId, courseId),
        ),
      )
      .orderBy(desc(chatConversations.updatedAt));

    return conversations;
  } catch (error) {
    console.error("Failed to get course conversations:", error);
    throw error;
  }
}

/**
 * Get conversations for a specific topic
 */
export async function getTopicConversations(
  userId: string,
  topicName: string,
) {
  try {
    const conversations = await db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.topicName, topicName),
        ),
      )
      .orderBy(desc(chatConversations.updatedAt));

    return conversations;
  } catch (error) {
    console.error("Failed to get topic conversations:", error);
    throw error;
  }
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(conversationId: string) {
  try {
    await db
      .delete(chatConversations)
      .where(eq(chatConversations.id, conversationId));
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    throw error;
  }
}

/**
 * Generate a unique conversation ID
 */
export function generateConversationId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
