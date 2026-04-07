import { randomUUID } from "node:crypto";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  sql,
} from "drizzle-orm";

import { db } from "@/config/db";
import { forumRepliesTable, forumThreadsTable } from "@/config/schema";
import { ServiceError } from "@/lib/service-error";
import { getProfile } from "@/services/profile.service";

const MAX_REPLY_DEPTH = 5;

type ForumThreadRecord = typeof forumThreadsTable.$inferSelect;
type ForumReplyRecord = typeof forumRepliesTable.$inferSelect;

export type ForumThreadView = {
  id: string;
  title: string;
  content: string;
  pseudonym: string;
  avatar: string;
  createdAt: Date;
  updatedAt: Date;
  replyCount: number;
};

export type ForumReplyView = {
  id: string;
  content: string;
  pseudonym: string;
  avatar: string;
  createdAt: Date;
  replies: ForumReplyView[];
};

const mapThread = (
  thread: ForumThreadRecord,
  replyCount: number,
): ForumThreadView => ({
  id: thread.id,
  title: thread.title,
  content: thread.content,
  pseudonym: thread.pseudonymSnapshot,
  avatar: thread.avatarSnapshot,
  createdAt: thread.createdAt,
  updatedAt: thread.updatedAt,
  replyCount,
});

const mapReply = (reply: ForumReplyRecord): ForumReplyView => ({
  id: reply.id,
  content: reply.content,
  pseudonym: reply.pseudonymSnapshot,
  avatar: reply.avatarSnapshot,
  createdAt: reply.createdAt,
  replies: [],
});

const getThreadRecord = async (threadId: string) => {
  const threads = await db
    .select()
    .from(forumThreadsTable)
    .where(eq(forumThreadsTable.id, threadId))
    .limit(1);

  return threads[0] ?? null;
};

const getReplyDepth = async (
  threadId: string,
  parentReplyId?: string,
): Promise<number> => {
  if (!parentReplyId) {
    return 0;
  }

  let depth = 1;
  let currentParentId: string | null = parentReplyId;

  while (currentParentId) {
    const replies = await db
      .select()
      .from(forumRepliesTable)
      .where(
        and(
          eq(forumRepliesTable.id, currentParentId),
          eq(forumRepliesTable.threadId, threadId),
        ),
      )
      .limit(1);

    const reply = replies[0];

    if (!reply) {
      throw new ServiceError(404, "Parent reply not found");
    }

    currentParentId = reply.parentReplyId;
    if (currentParentId) {
      depth += 1;
    }
  }

  return depth;
};

export const createThread = async (
  userId: string,
  title: string,
  content: string,
) => {
  const profile = await getProfile(userId);

  const [thread] = await db
    .insert(forumThreadsTable)
    .values({
      id: randomUUID(),
      userId,
      title,
      content,
      pseudonymSnapshot: profile.pseudonym,
      avatarSnapshot: profile.avatar,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return mapThread(thread, 0);
};

export const getThreads = async ({
  page = 1,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
}) => {
  const offset = (page - 1) * pageSize;

  const [totalResults, threads] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(forumThreadsTable),
    db
      .select()
      .from(forumThreadsTable)
      .orderBy(desc(forumThreadsTable.updatedAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  const total = totalResults[0]?.count ?? 0;

  const replyCountMap = new Map<string, number>();

  if (threads.length > 0) {
    const replyCounts = await db
      .select({
        threadId: forumRepliesTable.threadId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(forumRepliesTable)
      .where(inArray(forumRepliesTable.threadId, threads.map((thread) => thread.id)))
      .groupBy(forumRepliesTable.threadId);

    replyCounts.forEach((replyCount) => {
      replyCountMap.set(replyCount.threadId, replyCount.count);
    });
  }

  return {
    items: threads.map((thread) =>
      mapThread(thread, replyCountMap.get(thread.id) ?? 0),
    ),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
};

export const getReplies = async (threadId: string) => {
  const replies = await db
    .select()
    .from(forumRepliesTable)
    .where(eq(forumRepliesTable.threadId, threadId))
    .orderBy(asc(forumRepliesTable.createdAt));

  const nodeMap = new Map<string, ForumReplyView>();
  const roots: ForumReplyView[] = [];

  replies.forEach((reply) => {
    nodeMap.set(reply.id, mapReply(reply));
  });

  replies.forEach((reply) => {
    const node = nodeMap.get(reply.id);

    if (!node) {
      return;
    }

    if (reply.parentReplyId) {
      const parentNode = nodeMap.get(reply.parentReplyId);
      if (parentNode) {
        parentNode.replies.push(node);
        return;
      }
    }

    roots.push(node);
  });

  return roots;
};

export const getThreadById = async (threadId: string) => {
  const thread = await getThreadRecord(threadId);

  if (!thread) {
    throw new ServiceError(404, "Thread not found");
  }

  const [replies, replyCountResults] = await Promise.all([
    getReplies(threadId),
    db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(forumRepliesTable)
      .where(eq(forumRepliesTable.threadId, threadId)),
  ]);

  return {
    thread: mapThread(thread, replyCountResults[0]?.count ?? 0),
    replies,
  };
};

export const createReply = async (
  userId: string,
  threadId: string,
  content: string,
  parentReplyId?: string,
) => {
  const thread = await getThreadRecord(threadId);

  if (!thread) {
    throw new ServiceError(404, "Thread not found");
  }

  const depth = await getReplyDepth(threadId, parentReplyId);
  if (depth >= MAX_REPLY_DEPTH) {
    throw new ServiceError(400, "Reply depth limit reached");
  }

  const profile = await getProfile(userId);

  const [reply] = await db
    .insert(forumRepliesTable)
    .values({
      id: randomUUID(),
      threadId,
      userId,
      parentReplyId: parentReplyId ?? null,
      content,
      pseudonymSnapshot: profile.pseudonym,
      avatarSnapshot: profile.avatar,
      createdAt: new Date(),
    })
    .returning();

  await db
    .update(forumThreadsTable)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(forumThreadsTable.id, threadId));

  return mapReply(reply);
};
