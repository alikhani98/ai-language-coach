import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { dailyLessons } from "@/lib/db/schema";
import { mapLessonRow, parseLessonContent, type DailyLesson } from "@/lib/daily/lesson";
import { formatMySqlUtcDateTime } from "@/lib/mysql/profile";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertMySqlLessonKey(appUserId: string, date: string): void {
  if (!UUID_PATTERN.test(appUserId)) throw new Error("Invalid application identity.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date) {
    throw new Error("Invalid lesson date.");
  }
}

export function isMySqlDuplicateKey(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? error.code : undefined;
  const errno = "errno" in error ? error.errno : undefined;
  return code === "ER_DUP_ENTRY" || errno === 1062;
}

/** Preserve the established DailyLesson interface and UTC timestamp semantics. */
export function mapMySqlLesson(row: typeof dailyLessons.$inferSelect): DailyLesson {
  return mapLessonRow({
    id: row.id,
    user_id: row.userId,
    date: row.date,
    words: row.words,
    sentence: row.sentence,
    reading_text: row.readingText,
    speaking_task: row.speakingTask,
    completed: row.completed === 1,
    generation_status: row.generationStatus,
    created_at: formatMySqlUtcDateTime(row.createdAt),
  });
}

/** appUserId must come from a server-verified Better Auth application identity. */
export async function getMySqlDailyLesson(appUserId: string, date: string) {
  assertMySqlLessonKey(appUserId, date);
  const rows = await getMySqlDatabase().select().from(dailyLessons)
    .where(and(eq(dailyLessons.userId, appUserId), eq(dailyLessons.date, date)))
    .limit(1);
  return rows[0] ? mapMySqlLesson(rows[0]) : null;
}

/** Atomic unique(user_id,date) claim. Concurrent attempts reuse the same lesson. */
export async function claimMySqlDailyLesson(appUserId: string, date: string) {
  assertMySqlLessonKey(appUserId, date);
  const existing = await getMySqlDailyLesson(appUserId, date);
  if (existing) return { lesson: existing, claimed: false };

  try {
    await getMySqlDatabase().insert(dailyLessons).values({
      id: randomUUID(),
      userId: appUserId,
      date,
      words: [],
      sentence: "Generation in progress",
      readingText: "Generation in progress",
      speakingTask: "Generation in progress",
      generationStatus: "pending",
      completed: 0,
    });
  } catch (error) {
    if (!isMySqlDuplicateKey(error)) throw error;
    const concurrent = await getMySqlDailyLesson(appUserId, date);
    if (!concurrent) throw new Error("Duplicate lesson claim could not be resolved.");
    return { lesson: concurrent, claimed: false };
  }

  const lesson = await getMySqlDailyLesson(appUserId, date);
  if (!lesson) throw new Error("Claimed lesson could not be read.");
  return { lesson, claimed: true };
}

/** Publish validated AI output only while this learner's lesson is pending. */
export async function publishMySqlDailyLesson(
  appUserId: string,
  lessonId: string,
  content: unknown,
) {
  if (!UUID_PATTERN.test(appUserId) || !UUID_PATTERN.test(lessonId)) {
    throw new Error("Invalid lesson identity.");
  }
  const lesson = parseLessonContent(content);
  await getMySqlDatabase().update(dailyLessons).set({
    words: lesson.words,
    sentence: lesson.sentence,
    readingText: lesson.reading,
    speakingTask: lesson.speakingTask,
    generationStatus: "ready",
  }).where(and(
    eq(dailyLessons.id, lessonId),
    eq(dailyLessons.userId, appUserId),
    eq(dailyLessons.generationStatus, "pending"),
  ));
}

/** Mark only a pending, owned lesson as failed; never overwrite ready lessons. */
export async function failMySqlDailyLesson(appUserId: string, lessonId: string) {
  if (!UUID_PATTERN.test(appUserId) || !UUID_PATTERN.test(lessonId)) {
    throw new Error("Invalid lesson identity.");
  }
  await getMySqlDatabase().update(dailyLessons)
    .set({ generationStatus: "failed" })
    .where(and(
      eq(dailyLessons.id, lessonId),
      eq(dailyLessons.userId, appUserId),
      eq(dailyLessons.generationStatus, "pending"),
    ));
}

/** Idempotent completion; only a ready lesson belonging to the learner is updated. */
export async function completeMySqlDailyLesson(appUserId: string, lessonId: string) {
  if (!UUID_PATTERN.test(appUserId) || !UUID_PATTERN.test(lessonId)) {
    throw new Error("Invalid lesson identity.");
  }
  await getMySqlDatabase().update(dailyLessons).set({ completed: 1 })
    .where(and(
      eq(dailyLessons.id, lessonId),
      eq(dailyLessons.userId, appUserId),
      eq(dailyLessons.generationStatus, "ready"),
      eq(dailyLessons.completed, 0),
    ));
}
