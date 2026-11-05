import { sql } from "drizzle-orm";
import {
  char,
  check,
  date,
  datetime,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const uuid = (name: string) => char(name, { length: 36 });
const utcCreatedAt = (name = "created_at") =>
  datetime(name, { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`);

export const appUsers = mysqlTable(
  "app_users",
  {
    id: uuid("id").primaryKey(),
    // Keeps the application identity stable while Supabase Auth remains live.
    authProvider: mysqlEnum("auth_provider", ["supabase", "better_auth"])
      .notNull()
      .default("supabase"),
    authSubjectId: varchar("auth_subject_id", { length: 191 }).notNull(),
    role: mysqlEnum("role", ["learner", "admin"]).notNull().default("learner"),
    createdAt: utcCreatedAt(),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdateFn(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("app_users_provider_subject_unique").on(
      table.authProvider,
      table.authSubjectId,
    ),
  ],
);

export const usersProfile = mysqlTable(
  "users_profile",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    level: varchar("level", { length: 32 }).notNull(),
    goal: varchar("goal", { length: 32 }).notNull(),
    dailyMinutes: int("daily_minutes").notNull().default(15),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    interfaceLanguage: mysqlEnum("interface_language", ["en", "fa"])
      .notNull()
      .default("en"),
    themePreference: mysqlEnum("theme_preference", [
      "light",
      "dark",
      "system",
      "auto",
    ])
      .notNull()
      .default("system"),
    status: mysqlEnum("status", ["pending", "active", "suspended", "rejected"])
      .notNull()
      .default("pending"),
    approvedAt: datetime("approved_at", { mode: "string", fsp: 3 }),
    approvedBy: uuid("approved_by").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    createdAt: utcCreatedAt(),
  },
  (table) => [
    uniqueIndex("users_profile_user_unique").on(table.userId),
    index("users_profile_status_created_idx").on(
      table.status,
      table.createdAt,
      table.userId,
    ),
    check("users_profile_daily_minutes_check", sql`${table.dailyMinutes} between 10 and 30`),
  ],
);

export const dailyLessons = mysqlTable(
  "daily_lessons",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    words: json("words").notNull(),
    sentence: text("sentence").notNull(),
    readingText: text("reading_text").notNull(),
    speakingTask: text("speaking_task").notNull(),
    completed: int("completed").notNull().default(0),
    generationStatus: mysqlEnum("generation_status", ["pending", "ready", "failed"])
      .notNull()
      .default("ready"),
    createdAt: utcCreatedAt(),
  },
  (table) => [
    uniqueIndex("daily_lessons_user_date_unique").on(table.userId, table.date),
    index("daily_lessons_user_date_idx").on(table.userId, table.date),
    index("daily_lessons_user_status_idx").on(table.userId, table.generationStatus),
    check("daily_lessons_words_array_check", sql`JSON_TYPE(${table.words}) = 'ARRAY'`),
    check("daily_lessons_completed_check", sql`${table.completed} in (0, 1)`),
  ],
);

export const conversations = mysqlTable(
  "conversations",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    topic: varchar("topic", { length: 32 }).notNull(),
    // Retained for source compatibility; normalized messages are authoritative.
    messages: json("messages").notNull(),
    feedback: text("feedback"),
    status: mysqlEnum("status", ["active", "ended"]).notNull().default("active"),
    activeRequestId: varchar("active_request_id", { length: 128 }),
    activeGenerationStartedAt: datetime("active_generation_started_at", {
      mode: "string",
      fsp: 3,
    }),
    endedAt: datetime("ended_at", { mode: "string", fsp: 3 }),
    createdAt: utcCreatedAt(),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdateFn(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("conversations_user_created_at_idx").on(table.userId, table.createdAt),
    index("conversations_user_updated_at_idx").on(table.userId, table.updatedAt),
    check("conversations_messages_array_check", sql`JSON_TYPE(${table.messages}) = 'ARRAY'`),
  ],
);

export const conversationMessages = mysqlTable(
  "conversation_messages",
  {
    id: uuid("id").primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["user", "assistant"]).notNull(),
    content: text("content").notNull(),
    corrections: json("corrections").notNull(),
    requestId: varchar("request_id", { length: 128 }),
    createdAt: utcCreatedAt(),
  },
  (table) => [
    uniqueIndex("conversation_messages_request_unique").on(
      table.conversationId,
      table.role,
      table.requestId,
    ),
    index("conversation_messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
      table.id,
    ),
    index("conversation_messages_user_created_idx").on(table.userId, table.createdAt),
    index("conversation_messages_memory_request_idx").on(
      table.userId,
      table.conversationId,
      table.requestId,
      table.role,
    ),
    check("conversation_messages_content_length_check", sql`CHAR_LENGTH(${table.content}) <= 2000`),
    check("conversation_messages_corrections_array_check", sql`JSON_TYPE(${table.corrections}) = 'ARRAY'`),
  ],
);

export const mistakes = mysqlTable(
  "mistakes",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    wrongSentence: text("wrong_sentence").notNull(),
    correctSentence: text("correct_sentence").notNull(),
    explanation: text("explanation").notNull(),
    category: varchar("category", { length: 32 }).notNull(),
    sourceMessageId: uuid("source_message_id").references(
      () => conversationMessages.id,
      { onDelete: "set null" },
    ),
    correctionIndex: int("correction_index"),
    dismissedAt: datetime("dismissed_at", { mode: "string", fsp: 3 }),
    createdAt: utcCreatedAt(),
  },
  (table) => [
    uniqueIndex("mistakes_source_message_correction_unique").on(
      table.sourceMessageId,
      table.correctionIndex,
    ),
    index("mistakes_user_category_idx").on(table.userId, table.category),
    index("mistakes_user_created_at_idx").on(table.userId, table.createdAt),
    index("mistakes_user_dismissed_idx").on(table.userId, table.dismissedAt),
  ],
);

export const practiceLogs = mysqlTable(
  "practice_logs",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    activityType: varchar("activity_type", { length: 64 }).notNull(),
    duration: int("duration").notNull(),
    createdAt: utcCreatedAt(),
  },
  (table) => [
    index("practice_logs_user_created_at_idx").on(table.userId, table.createdAt),
    check("practice_logs_duration_check", sql`${table.duration} > 0`),
  ],
);

export const learningMemory = mysqlTable(
  "learning_memory",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    schemaVersion: int("schema_version").notNull().default(1),
    asOf: date("as_of", { mode: "string" }).notNull(),
    snapshot: json("snapshot").notNull(),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdateFn(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    check("learning_memory_schema_version_check", sql`${table.schemaVersion} = 1`),
    check("learning_memory_snapshot_object_check", sql`JSON_TYPE(${table.snapshot}) = 'OBJECT'`),
    check("learning_memory_snapshot_size_check", sql`OCTET_LENGTH(${table.snapshot}) <= 12000`),
  ],
);

export const adminAuditLogs = mysqlTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey(),
    adminUserId: uuid("admin_user_id").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    targetUserId: uuid("target_user_id").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    action: mysqlEnum("action", [
      "user_approved",
      "user_rejected",
      "user_suspended",
      "user_reactivated",
      "user_updated",
    ]).notNull(),
    metadata: json("metadata").notNull(),
    createdAt: utcCreatedAt(),
  },
  (table) => [
    index("admin_audit_logs_created_idx").on(table.createdAt, table.id),
    index("admin_audit_logs_target_idx").on(table.targetUserId, table.createdAt),
    check("admin_audit_logs_metadata_object_check", sql`JSON_TYPE(${table.metadata}) = 'OBJECT'`),
    check("admin_audit_logs_metadata_size_check", sql`OCTET_LENGTH(${table.metadata}) <= 4096`),
  ],
);
