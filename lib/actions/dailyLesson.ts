"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/actions/profile";
import { generateDailyLesson } from "@/lib/ai/dailyCoach";
import { getLocalDateKey } from "@/lib/daily/date";
import {
  isUniqueConflict,
  mapLessonRow,
  parseLessonContent,
  type DailyLesson,
} from "@/lib/daily/lesson";
import { createClient } from "@/lib/supabase/server";

type LessonActionState = {
  lesson?: DailyLesson | null;
  error?: string;
  success?: string;
};

const lessonColumns =
  "id,user_id,date,words,sentence,reading_text,speaking_task,completed,generation_status,created_at";

async function fetchLesson(userId: string, date: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_lessons")
    .select(lessonColumns)
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapLessonRow(data) : null;
}

async function claimLesson(userId: string, date: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_lessons")
    .insert({
      user_id: userId,
      date,
      words: [],
      sentence: "Generation in progress",
      reading_text: "Generation in progress",
      speaking_task: "Generation in progress",
      generation_status: "pending",
    })
    .select(lessonColumns)
    .single();

  if (isUniqueConflict(error)) {
    return {
      lesson: await fetchLesson(userId, date),
      claimed: false,
    };
  }

  if (error) {
    throw new Error(error.message);
  }

  return {
    lesson: mapLessonRow(data),
    claimed: true,
  };
}

async function getLessonContext() {
  const profile = await requireProfile();
  const today = getLocalDateKey(new Date(), profile.timezone);

  return { profile, today };
}

export async function getTodaysLesson() {
  const { profile, today } = await getLessonContext();
  return fetchLesson(profile.user_id, today);
}

async function getLessonHistory(userId: string) {
  const supabase = await createClient();
  const [mistakesResult, conversationsResult] = await Promise.all([
    supabase
      .from("mistakes")
      .select("wrong_sentence")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("conversations")
      .select("topic")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    previousMistakes:
      mistakesResult.data?.map((item: { wrong_sentence: string }) => item.wrong_sentence) ??
      [],
    previousTopics:
      conversationsResult.data?.map((item: { topic: string }) => item.topic) ?? [],
  };
}

export async function generateTodaysLesson(
  previousState?: LessonActionState,
): Promise<LessonActionState> {
  void previousState;
  const { profile, today } = await getLessonContext();
  const existing = await fetchLesson(profile.user_id, today);

  if (existing?.generation_status === "ready") {
    return { lesson: existing, success: "Today's lesson is ready." };
  }

  if (existing?.generation_status === "pending") {
    return {
      lesson: existing,
      error: "Today's lesson is already being generated. Refresh in a moment.",
    };
  }

  const claim = existing
    ? { lesson: existing, claimed: false }
    : await claimLesson(profile.user_id, today);
  const claimed = claim.lesson;

  if (!claimed) {
    return { lesson: null, error: "Could not prepare today's lesson." };
  }

  if (claimed.generation_status === "ready") {
    return { lesson: claimed, success: "Today's lesson is ready." };
  }

  if (claimed.generation_status === "pending" && !claim.claimed) {
    return {
      lesson: claimed,
      error: "Today's lesson is already being generated. Refresh in a moment.",
    };
  }

  const supabase = await createClient();

  if (claimed.generation_status === "failed") {
    const { error } = await supabase
      .from("daily_lessons")
      .update({ generation_status: "pending" })
      .eq("id", claimed.id)
      .eq("user_id", profile.user_id);

    if (error) {
      return { lesson: claimed, error: error.message };
    }
  }

  try {
    const content = parseLessonContent(
      await generateDailyLesson({
        userProfile: {
          level: profile.level,
          goal: profile.goal,
          dailyMinutes: profile.daily_minutes,
          timezone: profile.timezone,
        },
        history: await getLessonHistory(profile.user_id),
      }),
    );

    const { data, error } = await supabase
      .from("daily_lessons")
      .update({
        words: content.words,
        sentence: content.sentence,
        reading_text: content.reading,
        speaking_task: content.speakingTask,
        generation_status: "ready",
      })
      .eq("id", claimed.id)
      .eq("user_id", profile.user_id)
      .select(lessonColumns)
      .single();

    if (error) {
      return { lesson: claimed, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/practice");

    return {
      lesson: mapLessonRow(data),
      success: "Today's lesson is ready.",
    };
  } catch (error) {
    await supabase
      .from("daily_lessons")
      .update({ generation_status: "failed" })
      .eq("id", claimed.id)
      .eq("user_id", profile.user_id);

    return {
      lesson: claimed,
      error:
        error instanceof Error
          ? error.message
          : "Daily lesson generation failed. Try again.",
    };
  }
}

export async function finishTodaysLesson(
  previousState?: LessonActionState,
): Promise<LessonActionState> {
  void previousState;
  const { profile, today } = await getLessonContext();
  const lesson = await fetchLesson(profile.user_id, today);

  if (!lesson) {
    return { lesson: null, error: "Generate today's lesson first." };
  }

  if (lesson.generation_status !== "ready") {
    return { lesson, error: "Today's lesson is not ready yet." };
  }

  if (lesson.completed) {
    return { lesson, success: "Practice was already completed." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_lessons")
    .update({ completed: true })
    .eq("id", lesson.id)
    .eq("user_id", profile.user_id)
    .select(lessonColumns)
    .single();

  if (error) {
    return { lesson, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/practice");

  return {
    lesson: mapLessonRow(data),
    success: "Practice completed.",
  };
}
