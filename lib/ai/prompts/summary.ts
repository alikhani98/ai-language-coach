import type { LearnerContext } from "@/lib/learner/context";
import type { SummaryEvidence } from "@/lib/learner/summary";
import { learnerPrompt } from "@/lib/ai/prompts/context";

export function buildSummaryPrompt(context: LearnerContext, evidence: SummaryEvidence) {
  return [
    learnerPrompt(context),
    `Observed session evidence: ${JSON.stringify(evidence)}`,
    `Write four brief, supportive progress notes in ${context.interfaceLanguage === "fa" ? "Persian" : "English"}. Keep English examples in English.`,
    "Report only observed practice. Words reviewed are not words mastered. Do not claim improved grammar, confidence, pronunciation or assessed speaking. Independent speaking is not assessed. With no exchanges, say no conversation practice was recorded. Suggest one concrete next practice task.",
  ].join("\n");
}
