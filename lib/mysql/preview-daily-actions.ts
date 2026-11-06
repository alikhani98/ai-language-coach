import "server-only";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/actions/profile";
import { generateDailyLesson } from "@/lib/ai/dailyCoach";
import { generateProgressSummary } from "@/lib/ai/progressCoach";
import { getLocalDateKey } from "@/lib/daily/date";
import { parseLessonContent } from "@/lib/daily/lesson";
import { getMessages } from "@/lib/i18n/config";
import { loadLearnerContext } from "@/lib/learner/load";
import { refreshLearningMemory } from "@/lib/memory/load";
import {
  claimMySqlDailyLesson,
  completeMySqlDailyLesson,
  failMySqlDailyLesson,
  getMySqlDailyLesson,
  publishMySqlDailyLesson,
} from "@/lib/mysql/daily-lesson";

/** Preview-only controller; the public Supabase action is unchanged without the gate. */
export async function generateMySqlPreviewDailyLesson() {
  const profile = await requireProfile();
  const date = getLocalDateKey(new Date(), profile.timezone);
  const m = getMessages(profile.interface_language);
  const existing = await getMySqlDailyLesson(profile.user_id, date);
  if (existing?.generation_status === "ready") {
    return { lesson: existing, success: m.actions.dailyReady };
  }
  if (existing?.generation_status === "pending") {
    return { lesson: existing, error: m.actions.dailyPending };
  }

  const { lesson, claimed } = await claimMySqlDailyLesson(profile.user_id, date);
  if (!claimed || !lesson) {
    return { lesson, error: m.actions.dailyPending };
  }

  try {
    const context = await loadLearnerContext(profile);
    const generated = parseLessonContent(await generateDailyLesson({
      userProfile: {
        level: profile.level,
        goal: profile.goal,
        dailyMinutes: profile.daily_minutes,
        timezone: profile.timezone,
        interfaceLanguage: profile.interface_language,
      },
      learnerContext: context,
      history: {
        previousMistakes: context.recentMistakes.map((item) => item.wrong_sentence),
        previousTopics: context.conversationHistory.map((item) => item.topic),
      },
    }));
    await publishMySqlDailyLesson(profile.user_id, lesson.id, generated);
    const updated = await getMySqlDailyLesson(profile.user_id, date);
    if (updated?.generation_status !== "ready") {
      throw new Error("Lesson publishing did not complete.");
    }
    revalidatePath("/dashboard");
    revalidatePath("/practice");
    return { lesson: updated, success: m.actions.dailyReady };
  } catch {
    await failMySqlDailyLesson(profile.user_id, lesson.id);
    return {
      lesson: { ...lesson, generation_status: "failed" as const },
      error: m.actions.dailyGenerationFailed,
    };
  }
}

export async function finishMySqlPreviewDailyLesson() {
  const profile = await requireProfile();
  const date = getLocalDateKey(new Date(), profile.timezone);
  const m = getMessages(profile.interface_language);
  const lesson = await getMySqlDailyLesson(profile.user_id, date);
  if (!lesson) return { lesson: null, error: m.actions.dailyGenerateFirst };
  if (lesson.generation_status !== "ready") {
    return { lesson, error: m.actions.dailyNotReady };
  }
  if (lesson.completed) return { lesson, success: m.actions.dailyAlreadyCompleted };
  await completeMySqlDailyLesson(profile.user_id, lesson.id);
  const updated = await getMySqlDailyLesson(profile.user_id, date);
  if (!updated?.completed) {
    return { lesson, error: m.actions.dailyNotReady };
  }
  try { await refreshLearningMemory(profile); } catch { /* optional derived cache */ }
  revalidatePath("/dashboard");
  revalidatePath("/practice");
  revalidatePath("/progress");
  return {
    lesson: updated,
    success: m.actions.dailyCompleted,
    summary: await generateProgressSummary(await loadLearnerContext(profile), {
      activity: "lesson",
      words: updated.words.map((item) => item.word),
      exchanges: 0,
      corrections: [],
    }),
  };
}
