# Quick Start: Chat Persistence

## What Was Added

Chat persistence is now fully implemented in your app. All user conversations are automatically saved to the database and can be resumed later.

## For Developers

### Database Setup
```bash
# Generate and run migrations
npx drizzle-kit generate pg
npx drizzle-kit migrate
```

### What Changed

1. **Database Schema** (`config/schema.ts`)
   - Added `chatConversations` table
   - Added `chatMessages` table

2. **API Endpoints** 
   - `/api/home-chat` - Now saves all messages
   - `/api/course-chat` - Now saves all messages
   - Both endpoints support GET to retrieve history

3. **Utility Library** (`lib/chat-persistence.ts`)
   - `createConversation()` - Create new conversation
   - `saveChatMessage()` - Save a message
   - `getConversationMessages()` - Retrieve messages
   - `getUserConversations()` - List user's conversations
   - `generateConversationId()` - Generate unique IDs

4. **Frontend Components**
   - `HomeChatPanel.tsx` - Loads/saves chat history
   - `CourseChatPanel.tsx` - Loads/saves chat history
   - Both support resuming old conversations

## How It Works

### Starting a New Chat
```typescript
// API automatically generates conversationId
const res = await axios.post("/api/home-chat", {
  topicName: "React",
  question: "What is useState?",
  // No conversationId = new conversation
});

const conversationId = res.data.conversationId; // Save this
```

### Resuming a Chat
```typescript
// Load history
const history = await axios.get("/api/home-chat", {
  params: { conversationId }
});

// Continue conversation
const res = await axios.post("/api/home-chat", {
  topicName: "React",
  question: "How do I use useEffect?",
  conversationId // Pass existing ID
});
```

## Files Modified

- `config/schema.ts` - Added chat tables
- `app/api/home-chat/route.ts` - Added persistence logic
- `app/api/course-chat/route.ts` - Added persistence logic
- `app/_components/HomeChatPanel.tsx` - Added history loading
- `app/(routes)/course/[courseId]/_components/CourseChatPanel.tsx` - Added history loading

## Files Created

- `lib/chat-persistence.ts` - Chat utility functions
- `lib/migrations.ts` - Migration documentation
- `CHAT_PERSISTENCE_GUIDE.md` - Comprehensive guide

## Testing

### Manual Testing
1. Open the chat panel
2. Ask a question
3. Close the panel and reopen it
4. Your chat history should be there
5. Click "New Conversation" to start fresh

### Database Verification
```sql
-- Check if tables exist and have data
SELECT * FROM chat_conversations;
SELECT * FROM chat_messages ORDER BY created_at DESC;

-- Check conversation history
SELECT * FROM chat_messages 
WHERE conversation_id = 'chat_xxx...' 
ORDER BY created_at;
```

## Environment Variables

Ensure these are set:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk auth (existing)

## Common Issues & Fixes

**Q: Messages not persisting?**
- A: Check migrations ran successfully
- A: Verify Clerk auth() returns userId

**Q: Conversations not showing?**
- A: Check browser console for API errors
- A: Verify database tables exist

**Q: Can't resume old chat?**
- A: Reload page completely
- A: Check conversationId is being returned from POST

## Performance Notes

- Queries are indexed by userId, conversationId, courseId, topicName
- Large conversation histories load instantly due to indexes
- Messages paginated in future if needed

## Future Enhancements

- [ ] Conversation search
- [ ] Export conversations
- [ ] Share conversations
- [ ] Analytics dashboard
- [ ] Conversation cleanup

---

**Status**: ✅ Production Ready
**Last Updated**: April 2026
