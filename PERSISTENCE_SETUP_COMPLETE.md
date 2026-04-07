# Chat Persistence - Complete Setup Guide

## ✅ Step 1: Environment Setup (Already Done)

Your `.env` file has `DATABASE_URL` configured:
```
DATABASE_URL=postgresql://neondb_owner:npg_dNF4WuYxSs8Z@ep-tiny-bonus-aezrs398-pooler.c-2.us-east-2.aws.neon.tech/ai-video-course-generator?sslmode=require&channel_binding=require
```

## ✅ Step 2: Database Schema Updated (Already Done)

New tables defined in `config/schema.ts`:
- ✅ `chatConversations` - Conversation metadata
- ✅ `chatMessages` - Message history

## ✅ Step 3: Generate Migrations (Already Done)

Migration file created:
- ✅ `drizzle/0000_confused_the_anarchist.sql`

## 📋 Step 4: Apply Migrations (Current Step)

Run this command with proper environment setup:

```bash
# Option A: Load .env and migrate (RECOMMENDED)
node -r dotenv/config ./node_modules/@drizzle-orm/node-modules/bin.js migrate

# Option B: Using npm script (if you add one)
npm run db:migrate

# Option C: Direct npx with env file
npx drizzle-kit migrate --config drizzle.config.ts
```

## 🚀 Step 5: Verify Migration Applied

Check that tables were created:

```sql
-- Connect to your database and run:
\dt chat_*

-- Should show:
-- Schema |   Name   | Type  | Owner
-- -----  | ------   | -----  | -----
--public | chat_conversations | table | neondb_owner
-- public | chat_messages        | table | neondb_owner
```

Or check from Node:
```javascript
// Create a test script to verify
import { db } from "@/config/db";
import { chatConversations } from "@/config/schema";

const result = await db.select().from(chatConversations).limit(1);
console.log("Tables exist!", result);
```

## 📦 Step 6: Verify Code Changes (Already Done)

✅ **Database Schema** (`config/schema.ts`)
- Added `chatConversations` table
- Added `chatMessages` table

✅ **API Endpoints Updated**
- ✅ `app/api/home-chat/route.ts` - POST saves messages, GET retrieves history
- ✅ `app/api/course-chat/route.ts` - POST saves messages, GET retrieves history

✅ **Chat Persistence Library** (`lib/chat-persistence.ts`)
- ✅ `createConversation()`
- ✅ `saveChatMessage()`
- ✅ `getConversationMessages()`
- ✅ `getUserConversations()`
- ✅ `deleteConversation()`
- ✅ `generateConversationId()`

✅ **Frontend Components** Updated
- ✅ `app/_components/HomeChatPanel.tsx` - Persistence enabled
- ✅ `app/(routes)/course/[courseId]/_components/CourseChatPanel.tsx` - Persistence enabled

## 💻 Step 7: Test the Implementation

### Test Locally:

1. **Start the development server:**
```bash
npm run dev
```

2. **Test Home Chat Persistence:**
   - Open the app in browser
   - Click "Topic Chat" button
   - Enter topic: `React Basics`
   - Ask: `What is useState?`
   - Notice the `conversationId` in the response
   - Close the panel
   - Reopen the panel
   - Messages should still be there ✓

3. **Test Course Chat Persistence:**
   - Navigate to any course
   - Click "Ask Course Bot" button
   - Ask a question
   - Close and reopen panel
   - Messages should be restored ✓

4. **Test New Conversation:**
   - Click "+ New Conversation" button
   - Chat history clears
   - New conversationId is generated ✓

### Database Verification:

Check that messages are being saved:

```sql
-- Query conversations
SELECT * FROM chat_conversations 
WHERE user_id = 'user_email@example.com';

-- Query messages
SELECT * FROM chat_messages 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔧 Troubleshooting

### Issue: "Cannot find module '@/lib/chat-persistence'"
**Solution:** Ensure aliases in `tsconfig.json` are set (they already are)

### Issue: "Auth error" or "Unauthorized"
**Solution:** Verify Clerk is configured and user is logged in
- Check: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env`
- Check: `CLERK_SECRET_KEY` in `.env`
- Login to app first before testing chat

### Issue: "Database connection refused"
**Solution:** Verify DATABASE_URL in `.env`:
```bash
# Test connection
npx drizzle-kit introspect
```

### Issue: "Tables don't exist"
**Solution:** Run migrations:
```bash
npx drizzle-kit migrate
```

### Issue: "conversationId undefined"
**Solution:** 
- Check API response includes `conversationId`
- Check browser console for error messages
- Verify user is authenticated (Clerk)

## 📊 Complete Checklist

- [x] Database schema with chat tables
- [x] Migration files generated
- [ ] Migrations applied to database ← **YOU ARE HERE**
- [x] API endpoints updated
- [x] Chat persistence library created
- [x] Frontend components updated (HomeChatPanel)
- [x] Frontend components updated (CourseChatPanel)
- [ ] Test persistence locally
- [ ] Deploy to production

## 🎯 Next Command to Run

**PowerShell:**
```powershell
# Load environment and run migrations
npx drizzle-kit migrate
```

**If that fails, try:**
```powershell
# Explicitly set environment variable for this session
$env:DATABASE_URL = (Get-Content .env | Select-String "DATABASE_URL" | ForEach-Object {$_.ToString().Split('=')[1]})
npx drizzle-kit migrate
```

**Or use a Node.js migration script:**

Create `scripts/migrate.js`:
```javascript
import 'dotenv/config';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from './config/db.ts';

await migrate(db, { 
  migrationsFolder: 'drizzle' 
});
console.log('✅ Migrations applied!');
```

Then run:
```bash
node --loader ts-node/esm scripts/migrate.js
```

## 📝 Code Examples

### Save a Message
```typescript
import { saveChatMessage } from "@/lib/chat-persistence";

await saveChatMessage(
  "chat_1234567890_abc123",  // conversationId
  "user",                     // role
  "What is React?",           // content
  sources,                    // optional RAG sources
  metadata                    // optional metadata
);
```

### Load Conversation
```typescript
import { getConversationMessages } from "@/lib/chat-persistence";

const messages = await getConversationMessages("chat_1234567890_abc123");
console.log(messages);
// Output: [{role: "user", content: "..."}, {role: "assistant", content: "..."}]
```

### List User Conversations
```typescript
import { getUserConversations } from "@/lib/chat-persistence";

const conversations = await getUserConversations("user@example.com");
conversations.forEach(conv => {
  console.log(`${conv.title} (${conv.chatType}) - ${conv.updatedAt}`);
});
```

## 🎬 Final Steps Summary

1. **Ensure DATABASE_URL is loaded:**
   - It's in `.env` ✓
   - Needs to be loaded when running migrations

2. **Run migrations:**
   ```bash
   npx drizzle-kit migrate
   ```

3. **Test the feature:**
   ```bash
   npm run dev
   # Open browser, test chat persistence
   ```

4. **Verify database:**
   - Check `chat_conversations` has data
   - Check `chat_messages` has data

5. **Deploy:**
   - Push to git
   - Deploy to production
   - Migrations run automatically in most platforms

---

**Status:** Ready to apply migrations ✅
**All code changes:** Already implemented ✅
**Next step:** Run migration commands above 👆
