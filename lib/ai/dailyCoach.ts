import type { LearnerContext } from "@/lib/learner/context";
import { buildPrompt, dailyLessonSchemaHint } from "@/lib/ai/prompts/lesson";
import { coachRole } from "@/lib/ai/prompts/context";
import { getAIProvider, type AIProvider } from "@/lib/ai/provider";
import {
  dailyLessonContentSchema,
  type DailyLessonContent,
} from "@/lib/validations/dailyLesson";

export type DailyCoachInput = {
  learnerContext?: LearnerContext;
  userProfile: {
    level: string;
    goal: string;
    dailyMinutes: number;
    timezone: string;
    interfaceLanguage: string;
  };
  history: {
    previousMistakes: string[];
    previousTopics: string[];
  };
};

export type DailyCoachLesson = DailyLessonContent;

export async function generateDailyLesson(
  input: DailyCoachInput,
  provider: AIProvider = getAIProvider(),
): Promise<DailyCoachLesson> {
  const rawLesson = await provider.generateDailyLesson({
    temperature: 0.4,
    maxTokens: 900,
    schemaName: "daily_language_lesson",
    schemaHint: dailyLessonSchemaHint,
    messages: [
      {
        role: "system",
        content:
          coachRole,
      },
      {
        role: "user",
        content: buildPrompt(input),
      },
    ],
  });

  return dailyLessonContentSchema.parse(rawLesson);
}
