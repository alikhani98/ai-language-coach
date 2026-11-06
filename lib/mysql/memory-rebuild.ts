import "server-only";

import { and, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { appUsers, usersProfile, dailyLessons, conversations, conversationMessages, mistakes, learningMemory } from "@/lib/db/schema";
import { getLocalDateKey } from "@/lib/daily/date";
import { formatMySqlUtcDateTime } from "@/lib/mysql/profile";
import { computeMySqlMemorySnapshot } from "@/lib/memory/mysql-snapshot";
import { buildLearnerMemory } from "@/lib/memory/learnerMemory";
import { conversationCorrectionSchema } from "@/lib/validations/conversation";
import type { LearningMemoryResult } from "@/lib/memory/load";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Bounded fetches prevent a single user from consuming arbitrary host memory.
// Once a user exceeds this cap, the cache fails closed instead of silently
// reporting inaccurate totals. Production-scale aggregation is a future optimization.
const MAX_ROWS = 20000;
function cap<T>(items: T[]): T[] {
  if (items.length > MAX_ROWS) throw Error("Memory evidence exceeds safe bound");
  return items;
}
function dayFromUtc(utc: string, timezone: string): string {
  return getLocalDateKey(new Date(formatMySqlUtcDateTime(utc)), timezone);
}

/** Recompute a canonical, numeric-only snapshot under a per-user transaction lock. */
export async function rebuildMySqlLearningMemory(
  appUserId: string, timezone: string,
): Promise<LearningMemoryResult> {
  if (!UUID.test(appUserId)) return { status: "unavailable" };
  try {
    return await getMySqlDatabase().transaction(async (tx): Promise<LearningMemoryResult> => {
      const actor = await tx.select({ id: appUsers.id, timezone: usersProfile.timezone })
        .from(appUsers).innerJoin(usersProfile, eq(usersProfile.userId, appUsers.id))
        .where(and(eq(appUsers.id, appUserId), eq(appUsers.authProvider, "better_auth"), eq(usersProfile.status, "active")))
        .for("update").limit(1);
      if (!actor[0] || actor[0].timezone !== timezone) return { status: "unavailable" };
      const today = getLocalDateKey(new Date(), timezone);
      const now = new Date().toISOString().slice(0, 23).replace("T", " ");
      const [lessons, answers, ended, linkedDismissals, manual] = await Promise.all([
        tx.select({ day: dailyLessons.date, words: dailyLessons.words })
          .from(dailyLessons).where(and(eq(dailyLessons.userId, appUserId), eq(dailyLessons.completed, 1), eq(dailyLessons.generationStatus, "ready"), lte(dailyLessons.date, today)))
          .limit(MAX_ROWS + 1),
        tx.select({ id: conversationMessages.id, conversationId: conversationMessages.conversationId,
          topic: conversations.topic, corrections: conversationMessages.corrections, createdAt: conversationMessages.createdAt })
          .from(conversationMessages).innerJoin(conversations, and(eq(conversations.id, conversationMessages.conversationId), eq(conversations.userId, appUserId)))
          .where(and(eq(conversationMessages.userId, appUserId), eq(conversationMessages.role, "assistant"), isNotNull(conversationMessages.requestId), lte(conversationMessages.createdAt, now),
            sql`EXISTS (SELECT 1 FROM conversation_messages AS um WHERE um.user_id = ${appUserId} AND um.conversation_id = ${conversationMessages.conversationId} AND um.role = 'user' AND um.request_id = ${conversationMessages.requestId})`))
          .limit(MAX_ROWS + 1),
        tx.select({ conversationId: conversations.id, endedAt: conversations.endedAt })
          .from(conversations).where(and(eq(conversations.userId, appUserId), eq(conversations.status, "ended"), isNotNull(conversations.endedAt), lte(conversations.endedAt, now)))
          .limit(MAX_ROWS + 1),
        tx.select({ source: mistakes.sourceMessageId, index: mistakes.correctionIndex })
          .from(mistakes).where(and(eq(mistakes.userId, appUserId), isNotNull(mistakes.sourceMessageId), isNotNull(mistakes.dismissedAt)))
          .limit(MAX_ROWS + 1),
        tx.select({ createdAt: mistakes.createdAt, category: mistakes.category,
          original: mistakes.wrongSentence, corrected: mistakes.correctSentence, explanation: mistakes.explanation })
          .from(mistakes).where(and(eq(mistakes.userId, appUserId), isNull(mistakes.sourceMessageId), isNull(mistakes.dismissedAt), lte(mistakes.createdAt, now)))
          .limit(MAX_ROWS + 1),
      ]);
      cap(lessons); cap(answers); cap(ended); cap(linkedDismissals); cap(manual);
      const evidence = {
        lessons: lessons.map(l => ({ day: l.day, words: Array.isArray(l.words) ? l.words.length : 0 })),
        answers: answers.map(a => {
          const corrections = conversationCorrectionSchema.array().safeParse(a.corrections);
          return { id: a.id, conversationId: a.conversationId, topic: a.topic,
            day: dayFromUtc(a.createdAt, timezone), corrections: corrections.success ? corrections.data : [] };
        }),
        ended: ended.filter(e => e.endedAt).map(e => ({ conversationId: e.conversationId,
          day: dayFromUtc(e.endedAt!, timezone) })),
        dismissed: new Set(linkedDismissals.filter(d => d.source && d.index !== null).map(d => `${d.source}:${d.index}`)),
        manual: manual.map(m => ({ day: dayFromUtc(m.createdAt, timezone), category: m.category,
          original: m.original, corrected: m.corrected, explanation: m.explanation })),
      };
      const snapshot = computeMySqlMemorySnapshot(today, evidence);
      if (Buffer.byteLength(JSON.stringify(snapshot), "utf8") > 12000) throw Error("Memory snapshot exceeds safe size");
      await tx.insert(learningMemory).values({ userId: appUserId, schemaVersion: 1, asOf: today, snapshot })
        .onDuplicateKeyUpdate({ set: { schemaVersion: 1, asOf: today, snapshot,
          updatedAt: sql`CURRENT_TIMESTAMP(3)` } });
      return { status: "ready", memory: buildLearnerMemory(snapshot, today) };
    });
  } catch {
    return { status: "unavailable" };
  }
}
