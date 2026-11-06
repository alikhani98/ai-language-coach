import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { appUsers, usersProfile, conversationMessages, conversations } from "@/lib/db/schema";
import {
  mapConversationMessageRow,
  mapConversationRow,
  type ConversationMessage,
  type ConversationThread,
} from "@/lib/conversation/model";
import { formatMySqlUtcDateTime } from "@/lib/mysql/profile";
import {
  conversationCoachResponseSchema,
  conversationMessageInputSchema,
  conversationTopicSchema,
} from "@/lib/validations/conversation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertAppUserId(id: string): void {
  if (!UUID.test(id)) throw new Error("Invalid application identity.");
}

function assertConversationId(id: string): void {
  if (!UUID.test(id)) throw new Error("Invalid conversation identity.");
}

/** Map all MySQL UTC DATETIME values to the current UI-facing ISO contract. */
export function mapMySqlConversation(row: typeof conversations.$inferSelect) {
  return mapConversationRow({
    id: row.id, user_id: row.userId, topic: row.topic,
    feedback: row.feedback, status: row.status,
    active_request_id: row.activeRequestId,
    active_generation_started_at: row.activeGenerationStartedAt
      ? formatMySqlUtcDateTime(row.activeGenerationStartedAt) : null,
    ended_at: row.endedAt ? formatMySqlUtcDateTime(row.endedAt) : null,
    created_at: formatMySqlUtcDateTime(row.createdAt),
    updated_at: formatMySqlUtcDateTime(row.updatedAt),
  });
}

export function mapMySqlConversationMessage(
  row: typeof conversationMessages.$inferSelect,
): ConversationMessage {
  return mapConversationMessageRow({
    id: row.id,
    conversation_id: row.conversationId,
    user_id: row.userId,
    role: row.role,
    content: row.content,
    corrections: row.corrections,
    request_id: row.requestId,
    created_at: formatMySqlUtcDateTime(row.createdAt),
  });
}

/** This bounded reader accepts ONLY appUserId obtained from a verified session. */
export async function getMySqlConversationThread(
  appUserId: string,
  conversationId: string,
): Promise<ConversationThread | null> {
  assertAppUserId(appUserId);
  assertConversationId(conversationId);
  const db = getMySqlDatabase();
  const rows = await db.select().from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, appUserId)))
    .limit(1);
  if (!rows[0]) return null;
  const messages = await db.select().from(conversationMessages)
    .where(and(eq(conversationMessages.conversationId, conversationId), eq(conversationMessages.userId, appUserId)))
    .orderBy(asc(conversationMessages.createdAt), asc(conversationMessages.id))
    .limit(60);
  return { conversation: mapMySqlConversation(rows[0]), messages: messages.map(mapMySqlConversationMessage) };
}

/** List only the authenticated learner's conversations, newest first. */
export async function listMySqlConversations(appUserId: string, limit = 20) {
  assertAppUserId(appUserId);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new Error("Invalid conversation page size.");
  }
  const rows = await getMySqlDatabase().select().from(conversations)
    .where(eq(conversations.userId, appUserId))
    .orderBy(desc(conversations.updatedAt), desc(conversations.id)).limit(limit);
  return rows.map(mapMySqlConversation);
}

/** Server-validated topic; new conversation is always owned by the verified app user. */
export async function createMySqlConversation(appUserId: string, topicInput: unknown) {
  assertAppUserId(appUserId);
  const topic = conversationTopicSchema.parse(topicInput);
  const conversationId = randomUUID();
  await getMySqlDatabase().insert(conversations).values({
    id: conversationId, userId: appUserId, topic,
    messages: [], status: "active", activeRequestId: null,
  });
  return getMySqlConversationThread(appUserId, conversationId);
}

export function parseMySqlExchangeInput(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Invalid exchange.");
  const value = input as Record<string, unknown>;
  const user = conversationMessageInputSchema.parse({
    conversationId: value.conversationId,
    requestId: value.requestId,
    text: value.text,
  });
  const assistant = conversationCoachResponseSchema.parse({
    reply: value.reply,
    corrections: value.corrections,
  });
  return { user, assistant };
}

/**
 * Atomic two-message persistence after AI generation. Does not make AI calls.
 * Unique(conversation_id, role, request_id) makes duplicate request IDs fail.
 * The controller must still enforce its generation lock and request rate limits.
 * This adapter must NOT be connected to public actions before that integration.
 */
export async function appendMySqlConversationExchange(
  appUserId: string,
  input: unknown,
  lease?: string,
): Promise<void> {
  assertAppUserId(appUserId);
  if (!lease || !UUID.test(lease)) throw new Error("Invalid generation lease.");
  const { user, assistant } = parseMySqlExchangeInput(input);
  await getMySqlDatabase().transaction(async (tx) => {
    // Revocation can happen during AI generation: fail closed before persisting.
    const actor = await tx.select({ id: appUsers.id }).from(appUsers)
      .innerJoin(usersProfile, eq(usersProfile.userId, appUsers.id))
      .where(and(eq(appUsers.id, appUserId), eq(appUsers.authProvider, "better_auth"),
        eq(usersProfile.status, "active")))
      .for("update").limit(1);
    if (!actor.length) throw new Error("Application access revoked.");
    const owned = await tx.select({ id: conversations.id }).from(conversations)
      .where(and(
        eq(conversations.id, user.conversationId),
        eq(conversations.userId, appUserId),
        eq(conversations.status, "active"),
        eq(conversations.activeRequestId, lease),
      )).for("update").limit(1);
    if (!owned[0]) throw new Error("Conversation is unavailable.");

    const existing = await tx.select({ id: conversationMessages.id })
      .from(conversationMessages)
      .where(and(
        eq(conversationMessages.conversationId, user.conversationId),
        eq(conversationMessages.userId, appUserId),
      )).limit(60);
    if (existing.length > 58) throw new Error("Conversation message limit reached.");

    await tx.insert(conversationMessages).values([
      { id: randomUUID(), userId: appUserId, conversationId: user.conversationId,
        role: "user", content: user.text, requestId: user.requestId, corrections: [] },
      { id: randomUUID(), userId: appUserId, conversationId: user.conversationId,
        role: "assistant", content: assistant.reply, requestId: user.requestId,
        corrections: assistant.corrections },
    ]);
    // Update is scoped to owner; no privileged columns are exposed to callers.
    await tx.update(conversations).set({
      updatedAt: sql`CURRENT_TIMESTAMP(3)`,
      activeRequestId: null,
      activeGenerationStartedAt: null,
    }).where(and(eq(conversations.id, user.conversationId),
      eq(conversations.userId, appUserId),
      eq(conversations.activeRequestId, lease)));
  });
}
