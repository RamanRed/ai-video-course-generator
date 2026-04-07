import {
  integer,
  json,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  // JWT auth: password hash stored for credential-based login
  passwordHash: varchar({ length: 255 }),
  credits: integer().default(2),
});

export const coursesTable = pgTable("courses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar({ length: 255 })
    .notNull()
    .references(() => usersTable.email),
  courseId: varchar({ length: 255 }).notNull().unique(),
  courseName: varchar({ length: 255 }).notNull(),
  userInput: varchar({ length: 1024 }).notNull(),
  type: varchar({ length: 100 }).notNull(),
  courseLayout: json(),
  createdAt: timestamp().defaultNow(),
});

export const chapterContentSlides = pgTable("chapter_content_slides", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  courseId: varchar({ length: 255 })
    .notNull()
    .references(() => coursesTable.courseId),
  chapterId: varchar({ length: 255 }).notNull(),
  slideId: varchar({ length: 255 }).notNull(),
  slideIndex: integer().notNull(),
  audioFileName: varchar({ length: 255 }).notNull(),
  audioFileUrl: varchar({ length: 1024 }).notNull(),
  narration: json().notNull(),
  html: text(),
  revealData: json("revelData").notNull(),
});

// Chat persistence tables
export const chatConversations = pgTable("chat_conversations", {
  id: varchar({ length: 255 }).primaryKey(),
  userId: varchar({ length: 255 })
    .notNull()
    .references(() => usersTable.email),
  courseId: varchar({ length: 255 }),
  topicName: varchar({ length: 255 }),
  chatType: varchar({ length: 50 }).notNull(), // "course" or "home"
  title: varchar({ length: 255 }),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  conversationId: varchar({ length: 255 })
    .notNull()
    .references(() => chatConversations.id, { onDelete: "cascade" }),
  role: varchar({ length: 50 }).notNull(), // "user" or "assistant"
  content: text().notNull(),
  sources: json(), // For storing RAG sources
  metadata: json(), // For additional context
  createdAt: timestamp().defaultNow(),
});
