import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { conversations, dailyLessons, mistakes } from "@/lib/db/schema";
import type { UserProfile } from "@/lib/actions/profile";
import { buildLearnerContext } from "@/lib/learner/context";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Bounded learner history from MySQL. Caller must pass a profile retrieved
 * from the server-verified Better Auth user's application identity.
 * Optional learning-memory snapshots are handled in a separate migration.
 */
export async function loadMySqlLearnerContext(profile: UserProfile) {
  if (!UUID_PATTERN.test(profile.user_id)) throw new Error("Invalid application identity.");
  const fallback = () => buildLearnerContext(profile);

  try {
    const db = getMySqlDatabase();
    const userId = profile.user_id;
    const [mistakeRows, lessonRows, conversationRows] = await Promise.all([
      db.select({
        wrong_sentence: mistakes.wrongSentence,
        correct_sentence: mistakes.correctSentence,
        explanation: mistakes.explanation,
        category: mistakes.category,
      }).from(mistakes)
        .where(and(eq(mistakes.userId, userId), isNull(mistakes.dismissedAt)))
        .orderBy(desc(mistakes.createdAt)).limit(8),
      db.select({
        date: dailyLessons.date,
        sentence: dailyLessons.sentence,
        completed: dailyLessons.completed,
        readingText: dailyLessons.readingText,
        speakingTask: dailyLessons.speakingTask,
      }).from(dailyLessons)
        .where(and(eq(dailyLessons.userId, userId), eq(dailyLessons.generationStatus, "ready")))
        .orderBy(desc(dailyLessons.date)).limit(5),
      db.select({
        topic: conversations.topic,
        feedback: conversations.feedback,
        status: conversations.status,
      }).from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt)).limit(4),
    ]);

    return buildLearnerContext(profile, {
      mistakes: mistakeRows,
      lessons: lessonRows.map((lesson) => ({
        date: lesson.date,
        sentence: lesson.sentence,
        completed: lesson.completed === 1,
        summary: `Reading: ${lesson.readingText.slice(0, 240)} Speaking prompt: ${lesson.speakingTask.slice(0, 180)}`,
      })),
      conversations: conversationRows,
    });
  } catch {
    // Optional historical context must not block a lesson when MySQL is unavailable.
    return fallback();
  }
}
