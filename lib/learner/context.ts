import type { LearnerMemory } from "@/lib/memory/learnerMemory";

export type LearnerMistake = {
  wrong_sentence: string;
  correct_sentence: string;
  explanation: string;
  category: string;
};

export type LearnerContext = {
  learningMemory?: LearnerMemory;
  level: string;
  goal: string;
  dailyMinutes: number;
  interfaceLanguage: string;
  preferredExplanationStyle: string;
  weakAreas: string[];
  vocabularyWeaknesses: string[];
  recentMistakes: LearnerMistake[];
  recentLessons: { date: string; sentence: string; completed: boolean; summary?: string }[];
  conversationHistory: { topic: string; feedback: string | null }[];
  recentProgress: { completedLessons: number; endedConversations: number };
};

export function detectWeakArea(mistake: LearnerMistake): string {
  const explicitPast = /past (tense|simple)|simple past|زمان گذشته/i.test(mistake.explanation);
  const pastTime = /yesterday|last (week|night|year)|\bago\b/i.test(mistake.wrong_sentence);
  const changedPastVerb = [
    ["go", "went"], ["eat", "ate"], ["see", "saw"], ["have", "had"],
    ["do", "did"], ["buy", "bought"], ["is", "was"], ["are", "were"],
  ].some(([present, past]) =>
    new RegExp(`\\b${present}\\b`, "i").test(mistake.wrong_sentence) &&
    new RegExp(`\\b${past}\\b`, "i").test(mistake.correct_sentence));
  if (mistake.category === "grammar" && (explicitPast || (pastTime && changedPastVerb))) {
    return "past_simple";
  }
  return mistake.category;
}

export function buildLearnerContext(
  profile: { level: string; goal: string; daily_minutes: number; interface_language: string },
  history: {
    mistakes?: LearnerMistake[];
    lessons?: LearnerContext["recentLessons"];
    conversations?: (LearnerContext["conversationHistory"][number] & { status: string })[];
  } = {},
): LearnerContext {
  const clip = (text: string) => text.slice(0, 240);
  const recentMistakes = (history.mistakes ?? []).slice(0, 8).map((item) => ({
    wrong_sentence: clip(item.wrong_sentence), correct_sentence: clip(item.correct_sentence),
    explanation: clip(item.explanation), category: item.category.slice(0, 40),
  }));
  const counts = new Map<string, number>();
  for (const mistake of recentMistakes) {
    const area = detectWeakArea(mistake);
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  const recentLessons = (history.lessons ?? []).slice(0, 5).map((lesson) => ({
    date: lesson.date, completed: lesson.completed, sentence: clip(lesson.sentence),
    summary: lesson.summary?.slice(0, 500),
  }));
  const conversations = (history.conversations ?? []).slice(0, 4);
  return {
    level: profile.level, goal: profile.goal, dailyMinutes: profile.daily_minutes,
    interfaceLanguage: profile.interface_language,
    preferredExplanationStyle: profile.interface_language === "fa"
      ? "Brief Persian explanations with English examples" : "Brief English explanations with examples",
    weakAreas: [...counts].sort((a, b) => b[1] - a[1]).map(([area]) => area).slice(0, 3),
    vocabularyWeaknesses: recentMistakes.filter((item) => item.category === "vocabulary").map((item) => item.correct_sentence).slice(0, 3),
    recentMistakes, recentLessons,
    conversationHistory: conversations.map((item) => ({ topic: item.topic, feedback: item.feedback?.slice(0, 600) ?? null })),
    recentProgress: {
      completedLessons: recentLessons.filter((item) => item.completed).length,
      endedConversations: conversations.filter((item) => item.status === "ended").length,
    },
  };
}

// Extractive memory: bounded earlier learner excerpts plus the latest eight turns.
// No extra model request or persistent copy of the conversation is needed.
export function compactConversation(messages: { role: "user" | "assistant"; content: string }[]) {
  const bounded = messages.slice(-60);
  return {
    earlierSummary: bounded.slice(0, -8).filter((item) => item.role === "user")
      .filter((_, index, items) => index < 2 || index >= items.length - 4)
      .map((item) => item.content.slice(0, 150)).join(" | ").slice(0, 900),
    recentMessages: bounded.slice(-8).map((item) => ({ ...item, content: item.content.slice(0, 500) })),
  };
}
