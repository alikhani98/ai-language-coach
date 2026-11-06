import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { conversationMessages, mistakes } from "@/lib/db/schema";
import { countWeakAreas, groupMistakes, mapMistakeRow } from "@/lib/mistakes/model";
import { formatMySqlUtcDateTime } from "@/lib/mysql/profile";
import { conversationCorrectionSchema } from "@/lib/validations/conversation";
import { mistakeCategoryFilterSchema, mistakeIdSchema } from "@/lib/validations/mistake";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertAppUserId(appUserId: string): void {
  if (!UUID.test(appUserId)) throw new Error("Invalid application identity.");
}

export function mapMySqlMistake(row: typeof mistakes.$inferSelect) {
  return mapMistakeRow({
    id: row.id, user_id: row.userId,
    wrong_sentence: row.wrongSentence, correct_sentence: row.correctSentence,
    explanation: row.explanation, category: row.category,
    source_message_id: row.sourceMessageId,
    correction_index: row.correctionIndex,
    dismissed_at: row.dismissedAt ? formatMySqlUtcDateTime(row.dismissedAt) : null,
    created_at: formatMySqlUtcDateTime(row.createdAt),
  });
}

/** Read only non-dismissed mistakes owned by the authenticated app user. */
export async function getMySqlMistakeNotebook(appUserId: string, category?: string) {
  assertAppUserId(appUserId);
  const filter = mistakeCategoryFilterSchema.parse(category);
  const conditions = [eq(mistakes.userId, appUserId), isNull(mistakes.dismissedAt)];
  if (filter) conditions.push(eq(mistakes.category, filter));
  const rows = await getMySqlDatabase().select().from(mistakes)
    .where(and(...conditions)).orderBy(desc(mistakes.createdAt), desc(mistakes.id))
    .limit(500);
  const notebook = rows.map(mapMySqlMistake);
  return {
    mistakes: notebook,
    groups: groupMistakes(notebook),
    categories: Array.from(new Set(notebook.map((item) => item.category))).sort(),
  };
}

export async function getMySqlWeakAreas(appUserId: string, limit = 3) {
  assertAppUserId(appUserId);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error("Invalid weak-area limit.");
  }
  const rows = await getMySqlDatabase().select({ category: mistakes.category })
    .from(mistakes).where(and(eq(mistakes.userId, appUserId), isNull(mistakes.dismissedAt)));
  return countWeakAreas(rows).slice(0, limit);
}

/** Soft-dismiss a single owned mistake, leaving its source conversation intact. */
export async function dismissMySqlMistake(appUserId: string, mistakeIdInput: unknown) {
  assertAppUserId(appUserId);
  const mistakeId = mistakeIdSchema.parse(mistakeIdInput);
  await getMySqlDatabase().update(mistakes).set({ dismissedAt: sql`CURRENT_TIMESTAMP(3)` })
    .where(and(eq(mistakes.id, mistakeId), eq(mistakes.userId, appUserId), isNull(mistakes.dismissedAt)));
}

/**
 * Read corrections from an owned assistant message, never from client input.
 * Duplicate keys are treated as no-ops by MySQL; existing dismissals remain.
 */
export async function syncMySqlMessageCorrections(appUserId: string, messageId: string) {
  assertAppUserId(appUserId);
  if (!UUID.test(messageId)) throw new Error("Invalid message identity.");
  const db = getMySqlDatabase();
  const rows = await db.select().from(conversationMessages)
    .where(and(eq(conversationMessages.id, messageId), eq(conversationMessages.userId, appUserId), eq(conversationMessages.role, "assistant")))
    .limit(1);
  if (!rows[0]) return 0;
  const corrections = conversationCorrectionSchema.array().parse(rows[0].corrections);
  if (!corrections.length) return 0;

  for (const [index, item] of corrections.entries()) {
    await db.insert(mistakes).values({
      id: randomUUID(), userId: appUserId, wrongSentence: item.original,
      correctSentence: item.corrected, explanation: item.explanation,
      category: item.category, sourceMessageId: messageId, correctionIndex: index,
    }).onDuplicateKeyUpdate({ set: { id: sql`${mistakes.id}` } });
  }
  return corrections.length;
}
