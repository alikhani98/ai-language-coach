import { z } from "zod";
import {
  dailyLessonContentSchema,
  vocabularyItemSchema,
  type DailyLessonContent,
  type VocabularyItem,
} from "@/lib/validations/dailyLesson";

export const lessonStatusSchema = z.enum(["pending", "ready", "failed"]);
export type LessonStatus = z.infer<typeof lessonStatusSchema>;

export type DailyLesson = {
  id: string;
  user_id: string;
  date: string;
  words: VocabularyItem[];
  sentence: string;
  reading_text: string;
  speaking_task: string;
  completed: boolean;
  generation_status: LessonStatus;
  created_at: string;
};

export function parseLessonContent(content: unknown): DailyLessonContent {
  return dailyLessonContentSchema.parse(content);
}

export function mapLessonRow(row: Record<string, unknown>): DailyLesson {
  const words = z.array(vocabularyItemSchema).parse(row.words);

  return {
    id: z.string().parse(row.id),
    user_id: z.string().parse(row.user_id),
    date: z.string().parse(row.date),
    words,
    sentence: z.string().parse(row.sentence),
    reading_text: z.string().parse(row.reading_text),
    speaking_task: z.string().parse(row.speaking_task),
    completed: z.boolean().parse(row.completed),
    generation_status: lessonStatusSchema.parse(row.generation_status),
    created_at: z.string().parse(row.created_at),
  };
}

export function isUniqueConflict(error: { code?: string } | null) {
  return error?.code === "23505";
}

export function shouldReuseLesson(lesson: { generation_status: LessonStatus } | null) {
  return lesson?.generation_status === "ready";
}

export function canCompleteLesson(lesson: {
  completed: boolean;
  generation_status: LessonStatus;
} | null) {
  return Boolean(lesson && lesson.generation_status === "ready");
}

export function isCompletionIdempotent(lesson: {
  completed: boolean;
  generation_status: LessonStatus;
} | null) {
  return Boolean(lesson && lesson.generation_status === "ready" && lesson.completed);
}

export function isLessonOwnedByUser(
  lesson: { user_id: string } | null,
  userId: string | null,
) {
  return Boolean(lesson && userId && lesson.user_id === userId);
}

export function isProfileComplete(profile: {
  level?: string | null;
  goal?: string | null;
  daily_minutes?: number | null;
  timezone?: string | null;
  interface_language?: string | null;
  theme_preference?: string | null;
} | null) {
  return Boolean(
    profile?.level &&
      profile.goal &&
      profile.daily_minutes &&
      [10, 15, 30].includes(profile.daily_minutes) &&
      profile.timezone &&
      (profile.interface_language === undefined ||
        profile.interface_language === null ||
        ["en", "fa"].includes(profile.interface_language)) &&
      (profile.theme_preference === undefined ||
        profile.theme_preference === null ||
        ["light", "dark", "system", "auto"].includes(profile.theme_preference)),
  );
}
