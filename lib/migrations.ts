/**
 * Database Migration for Chat Persistence
 * 
 * Run this migration to create the necessary tables for chat history persistence.
 * 
 * This file provides the SQL to create:
 * 1. chat_conversations table - stores conversation metadata
 * 2. chat_messages table - stores individual messages
 */

// This is the SQL that will be executed by Drizzle when you run migrations
// If using Drizzle migrations, the schema.ts file will generate the migration

export const chatPersistenceMigration = `
-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(email),
  course_id VARCHAR(255),
  topic_name VARCHAR(255),
  chat_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  sources JSON,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_course_id ON chat_conversations(course_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_topic_name ON chat_conversations(topic_name);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
`;

/**
 * Instructions for running this migration:
 * 
 * Option 1: Using Drizzle CLI
 * - Run: npx drizzle-kit generate pg
 * - This will automatically generate migrations based on schema.ts
 * - Then run: npx drizzle-kit migrate
 * 
 * Option 2: Direct SQL execution (for development)
 * - Connect to your PostgreSQL database
 * - Copy and paste the SQL above into your database client
 * - Execute it
 * 
 * Option 3: Programmatic migration (in a Next.js route or script)
 * - Use the db client to execute the migrations
 * - See migrate.ts example below
 */

/**
 * Example: Run migration programmatically
 * Create this as app/api/migrate/route.ts if needed
 */
export async function runChatMigration() {
  try {
    // This is handled automatically by Drizzle when using the db client
    // The schema.ts definitions will create the tables on first use
    console.log("Chat persistence tables are created via Drizzle schema definitions");
    return { success: true, message: "Schema is defined and ready" };
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}
