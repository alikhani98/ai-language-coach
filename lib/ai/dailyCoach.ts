import { getAIProvider } from "@/lib/ai/provider";
import {
  dailyLessonContentSchema,
  type DailyLessonContent,
} from "@/lib/validations/dailyLesson";

export type DailyCoachInput = {
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

function getReadingLength(dailyMinutes: number) {
  if (dailyMinutes >= 30) return "130-180 words";
  if (dailyMinutes >= 15) return "90-130 words";
  return "60-90 words";
}

function buildPrompt(input: DailyCoachInput) {
  return [
    `User level: ${input.userProfile.level}`,
    `Goal: ${input.userProfile.goal}`,
    `Daily practice time: ${input.userProfile.dailyMinutes} minutes`,
    `Timezone: ${input.userProfile.timezone}`,
    `Interface language: ${input.userProfile.interfaceLanguage}`,
    `Previous mistakes: ${input.history.previousMistakes.join("; ") || "none"}`,
    `Previous topics: ${input.history.previousTopics.join("; ") || "none"}`,
    "",
    "Create one focused daily English lesson.",
    "Use CEFR-appropriate language and a calm coaching tone.",
    `Reading length should be ${getReadingLength(input.userProfile.dailyMinutes)}.`,
    "Vocabulary must include 3 to 5 practical items, each with meaning and example.",
    "The speaking task is for speaking aloud independently. Do not mention recording, microphones, transcription, pronunciation scoring, or live feedback.",
    "Keep the learning language English. Do not translate target English sentences, vocabulary items, or examples.",
  ].join("\n");
}

const dailyLessonSchemaHint = JSON.stringify({
  words: [
    {
      word: "string",
      meaning: "string",
      example: "string",
    },
  ],
  sentence: "string",
  reading: "string",
  speakingTask: "string",
});

export async function generateDailyLesson(
  input: DailyCoachInput,
): Promise<DailyCoachLesson> {
  const rawLesson = await getAIProvider().generateDailyLesson({
    temperature: 0.4,
    maxTokens: 900,
    schemaName: "daily_language_lesson",
    schemaHint: dailyLessonSchemaHint,
    messages: [
      {
        role: "system",
        content:
          "You are a friendly English language coach. Return only valid JSON lesson data.",
      },
      {
        role: "user",
        content: buildPrompt(input),
      },
    ],
  });

  return dailyLessonContentSchema.parse(rawLesson);
}
