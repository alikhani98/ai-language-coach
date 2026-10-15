import type { DailyCoachInput } from "@/lib/ai/dailyCoach";
import { learnerPrompt } from "@/lib/ai/prompts/context";
function getReadingLength(dailyMinutes: number) {
  if (dailyMinutes >= 30) return "130-180 words";
  if (dailyMinutes >= 15) return "90-130 words";
  return "60-90 words";
}

export function buildPrompt(input: DailyCoachInput) {
  return [
    `User level: ${input.userProfile.level}`,
    `Goal: ${input.userProfile.goal}`,
    `Daily practice time: ${input.userProfile.dailyMinutes} minutes`,
    `Timezone: ${input.userProfile.timezone}`,
    `Interface language: ${input.userProfile.interfaceLanguage}`,
    `Previous mistakes: ${input.history.previousMistakes.join("; ") || "none"}`,
    `Previous topics: ${input.history.previousTopics.join("; ") || "none"}`,
    "",
    learnerPrompt(input.learnerContext),
    "Use long-term recommendedFocus and repeatedWeaknesses when available. Treat historical patterns as review candidates, not permanent deficiencies. Vary tasks around practiced topics and recent lessons. Do not repeat a completed lesson verbatim. Learning memory contains practice evidence, not proof of mastery.",
    "Create one focused daily English lesson. Prioritize recurring weak areas, recycle vocabulary weaknesses, and build on previous lessons. Include past-tense examples when relevant and a short correction exercise inside the speaking task.",
    "Use CEFR-appropriate language and a calm coaching tone.",
    `Reading length should be ${getReadingLength(input.userProfile.dailyMinutes)}.`,
    "Vocabulary must include 3 to 5 practical items, each with meaning and example.",
    "The speaking task is for speaking aloud independently. Do not mention recording, microphones, transcription, pronunciation scoring, or live feedback.",
    "Keep the learning language English. Do not translate target English sentences, vocabulary items, or examples.",
  ].join("\n");
}

export const dailyLessonSchemaHint = JSON.stringify({
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
