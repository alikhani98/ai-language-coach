import { z } from "zod";

export const vocabularyItemSchema = z.object({
  word: z.string().min(1).max(60),
  meaning: z.string().min(1).max(160),
  example: z.string().min(1).max(220),
});

export const dailyLessonContentSchema = z.object({
  words: z.array(vocabularyItemSchema).min(3).max(5),
  sentence: z.string().min(8).max(220),
  reading: z.string().min(80).max(1400),
  speakingTask: z.string().min(20).max(420),
});

export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;
export type DailyLessonContent = z.infer<typeof dailyLessonContentSchema>;
