import { getAIProvider } from "@/lib/ai/provider";
import { coachRole } from "@/lib/ai/prompts/context";
import { buildSummaryPrompt } from "@/lib/ai/prompts/summary";
import type { LearnerContext } from "@/lib/learner/context";
import { fallbackProgressSummary, progressSummarySchema, type SummaryEvidence } from "@/lib/learner/summary";

export async function generateProgressSummary(context: LearnerContext, evidence: SummaryEvidence) {
  if (evidence.activity === "conversation" && evidence.exchanges === 0) {
    return fallbackProgressSummary(evidence, context.interfaceLanguage);
  }
  const bounded = { ...evidence, words: evidence.words.slice(0, 5), corrections: evidence.corrections.slice(-8) };
  try {
    const raw = await getAIProvider().analyzeMistake({
      temperature: 0.2, maxTokens: 450, schemaName: "learner_progress_summary",
      schemaHint: JSON.stringify({ vocabulary: "string", grammar: "string", speaking: "string", tomorrow: "string" }),
      messages: [{ role: "system", content: coachRole }, { role: "user", content: buildSummaryPrompt(context, bounded) }],
    });
    return progressSummarySchema.parse(raw);
  } catch {
    return fallbackProgressSummary(evidence, context.interfaceLanguage);
  }
}
