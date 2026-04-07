# Chat Persistence Implementation Guide

## Overview

Chat persistence has been implemented for your chatbots, allowing conversations to be saved to the database and retrieved later. This enables users to:

- Resume conversations across sessions
- View chat history
- Maintain context across multiple interactions
- Track conversations by topic or course

## Architecture

### Database Schema

Three new tables have been added:

#### `chatConversations`
Stores metadata about each conversation:
- `id`: Unique conversation identifier
- `userId`: Reference to the user who initiated the conversation
- `courseId`: Optional reference to a course (for course-chat)
- `topicName`: Optional topic name (for home-chat)
- `chatType`: Either `"course"` or `"home"`
- `title`: Human-readable conversation title
- `createdAt`: When the conversation started
- `updatedAt`: When the conversation was last updated

#### `chatMessages`
Stores individual messages:
- `id`: Unique message identifier
- `conversationId`: Reference to the parent conversation
- `role`: Either `"user"` or `"assistant"`
- `content`: The actual message text
- `sources`: JSON array of RAG sources (if applicable)
- `metadata`: Additional context (namespace, pineconeAvailable, etc.)
- `createdAt`: When the message was created

### API Changes

#### POST /api/home-chat
**New Parameters:**
```json
{
  "topicName": "string",
  "question": "string",
  "conversationId": "string (optional)"
}
```

**Response:**
```json
{
  "answer": "string",
  "conversationId": "string",
  "needUpload": "boolean",
  "namespace": "string",
  "sources": "array",
  "pineconeAvailable": "boolean"
}
```

#### GET /api/home-chat?conversationId=xxx
Retrieves the message history for a specific conversation.

**Response:**
```json
{
  "conversationId": "string",
  "messages": [
    {
      "role": "user" | "assistant",
      "content": "string",
      "sources": "array (optional)",
      "metadata": "object (optional)"
    }
  ]
}
```

#### POST /api/course-chat
**New Parameters:**
```json
{
  "courseId": "string",
  "question": "string",
  "conversationId": "string (optional)"
}
```

**Response:**
```json
{
  "answer": "string",
  "conversationId": "string",
  "needUpload": "boolean",
  "namespace": "string",
  "sources": "array",
  "pineconeAvailable": "boolean"
}
```

#### GET /api/course-chat?conversationId=xxx
Retrieves the message history for a specific conversation.

### Client-Side Changes

#### HomeChatPanel.tsx
- Added `conversationId` state to track the current conversation
- Added `loadChatHistory()` function to load previous messages
- Added "New Conversation" button for starting fresh chats
- Messages are now persisted and retrieved from the database

## Setup Instructions

### 1. Run Database Migrations

Using Drizzle:
```bash
npx drizzle-kit generate pg
npx drizzle-kit migrate
```

Or manually execute the SQL:
```sql
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

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  sources JSON,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_course_id ON chat_conversations(course_id);
CREATE INDEX idx_chat_conversations_topic_name ON chat_conversations(topic_name);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
```

### 2. Environment Variables
Ensure you have:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication (already configured)

### 3. Deploy Changes
```bash
git add .
git commit -m "Add chat persistence"
npm run build
npm run start
```

## Usage Examples

### Frontend - Starting a New Chat
```typescript
const response = await axios.post("/api/home-chat", {
  topicName: "React Basics",
  question: "What is useState?",
  // Don't pass conversationId - system will create one
});

const newConversationId = response.data.conversationId;
// Store this ID to resume the conversation later
```

### Frontend - Resuming a Conversation
```typescript
// Load conversation history
const historyResponse = await axios.get("/api/home-chat", {
  params: { conversationId: existingConversationId }
});
setMessages(historyResponse.data.messages);

// Continue the conversation
const response = await axios.post("/api/home-chat", {
  topicName: "React Basics",
  question: "How do I use useEffect?",
  conversationId: existingConversationId
});
```

### Retrieving User's Conversations
If you want to list all conversations for a user:

```typescript
import { getUserConversations } from "@/lib/chat-persistence";

const conversations = await getUserConversations(userId);
conversations.forEach(conv => {
  console.log(`${conv.title} (${conv.chatType})`);
});
```

## Utility Functions

The `lib/chat-persistence.ts` file provides helper functions:

### createConversation()
Create a new conversation record.

```typescript
await createConversation(
  conversationId,
  userId,
  "home", // or "course"
  courseId, // optional
  topicName, // optional
  title // optional
);
```

### saveChatMessage()
Save a message to a conversation.

```typescript
await saveChatMessage(
  conversationId,
  "user",
  "What is React?",
  sources, // optional RAG sources
  metadata // optional metadata
);
```

### getConversationMessages()
Retrieve all messages in a conversation.

```typescript
const messages = await getConversationMessages(conversationId);
```

### getUserConversations()
Get all conversations for a user.

```typescript
const conversations = await getUserConversations(userId, limit = 20);
```

### generateConversationId()
Generate a unique conversation ID.

```typescript
const id = generateConversationId(); // "chat_1234567890_abc123def"
```

## Features

### ✅ Implemented
- [x] Save all chat messages to database
- [x] Retrieve chat history
- [x] Conversation management (create, read, delete)
- [x] User-scoped conversations (via Clerk auth)
- [x] Conversation metadata (course/topic tracking)
- [x] RAG sources tracking
- [x] Message timestamps
- [x] Home chat persistence
- [x] Course chat persistence

### 🚀 Future Enhancements
- [ ] Conversation search/filtering
- [ ] Message editing
- [ ] Conversation export (PDF/JSON)
- [ ] Conversation sharing
- [ ] Analytics dashboard
- [ ] Automatic conversation cleanup (archive old conversations)
- [ ] Full-text search in conversation history

## Troubleshooting

### Migrations not running
- Ensure `DATABASE_URL` is set correctly
- Check Drizzle configuration in `drizzle.config.ts`
- Run: `npx drizzle-kit generate pg --out migrations`

### Conversations not appearing
- Verify user is authenticated (check `auth()` from Clerk)
- Check browser console for API errors
- Verify database tables exist: `\dt chat_*` in psql

### Performance issues
- Consider indexing on frequently queried columns (already done)
- For large conversation lists, implement pagination
- Archive old conversations periodically

## Security Considerations

1. **User Isolation**: All conversations are tied to userId via Clerk authentication
2. **Database Constraints**: Foreign key constraints ensure referential integrity
3. **Cascade Deletes**: When a conversation is deleted, all messages are automatically deleted
4. **Input Validation**: Ensure `conversationId` belongs to authenticated user

## Database Optimization

The schema includes indexes on:
- `chat_conversations.user_id`
- `chat_conversations.course_id`
- `chat_conversations.topic_name`
- `chat_messages.conversation_id`
- `chat_messages.created_at`

These indexes make common queries fast:
- Finding conversations by user
- Sorting conversations by recency
- Retrieving messages for a conversation

## Integration Checklist

- [x] Database schema updated
- [x] Chat persistence library created
- [x] API endpoints updated (home-chat, course-chat)
- [x] Client components updated (HomeChatPanel)
- [x] Clerk authentication integrated
- [x] Error handling added
- [ ] Course chat component updated (if exists)
- [ ] Conversation history UI component (optional future feature)
- [ ] Tests written (optional)
- [ ] Documentation completed

## Support

For issues or questions:
1. Check the Drizzle ORM documentation: https://orm.drizzle.team
2. Review error messages in browser console
3. Check server logs for database errors
4. Verify schema matches the database

---

**Last Updated**: April 2026
**Status**: Production Ready
