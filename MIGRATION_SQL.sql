-- =====================================================
-- CHAT PERSISTENCE MIGRATION
-- For: AI Video Course Generator
-- Created: April 7, 2026
-- =====================================================

-- IMPORTANT: Copy and paste ONLY this section into your database:
-- 1. Neon Console: https://console.neon.tech → SQL Editor
-- 2. DBeaver or any PostgreSQL client
-- 3. psql command line

-- =====================================================
-- CREATE CHAT_CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS "chat_conversations" (
    "id" varchar(255) PRIMARY KEY NOT NULL,
    "userId" varchar(255) NOT NULL REFERENCES "public"."users"("email"),
    "courseId" varchar(255),
    "topicName" varchar(255),
    "chatType" varchar(50) NOT NULL,
    "title" varchar(255),
    "createdAt" timestamp DEFAULT now(),
    "updatedAt" timestamp DEFAULT now()
);

-- =====================================================
-- CREATE CHAT_MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chat_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
    "conversationId" varchar(255) NOT NULL REFERENCES "public"."chat_conversations"("id") ON DELETE CASCADE,
    "role" varchar(50) NOT NULL,
    "content" text NOT NULL,
    "sources" json,
    "metadata" json,
    "createdAt" timestamp DEFAULT now()
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS "idx_chat_conversations_userId" ON "chat_conversations"("userId");
CREATE INDEX IF NOT EXISTS "idx_chat_conversations_courseId" ON "chat_conversations"("courseId");
CREATE INDEX IF NOT EXISTS "idx_chat_conversations_topicName" ON "chat_conversations"("topicName");
CREATE INDEX IF NOT EXISTS "idx_chat_messages_conversationId" ON "chat_messages"("conversationId");
CREATE INDEX IF NOT EXISTS "idx_chat_messages_createdAt" ON "chat_messages"("createdAt");

-- =====================================================
-- VERIFY TABLES WERE CREATED
-- =====================================================
-- Run these queries to verify:
-- 
-- SELECT COUNT(*) as conversation_count FROM chat_conversations;
-- SELECT COUNT(*) as message_count FROM chat_messages;
-- 
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name IN ('chat_conversations', 'chat_messages');

-- =====================================================
-- DONE!
-- =====================================================
-- Your chat persistence is now ready. The app will:
-- 1. Save every message to chat_conversations and chat_messages
-- 2. Load conversation history when user returns
-- 3. Support multiple conversations per user
-- 4. Track RAG sources and metadata
--
-- Test it by:
-- 1. Starting the dev server: npm run dev
-- 2. Opening chat and asking a question
-- 3. Closing and reopening chat - messages persist!
-- =====================================================
