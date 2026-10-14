import { z } from "zod";
import { formatMessage, getMessages } from "@/lib/i18n/config";

export const progressSummarySchema = z.object({
  vocabulary: z.string().min(1).max(350),
  grammar: z.string().min(1).max(350),
  speaking: z.string().min(1).max(350),
  tomorrow: z.string().min(1).max(350),
});
export type ProgressSummary = z.infer<typeof progressSummarySchema>;
export type SummaryEvidence = {
  activity: "lesson" | "conversation";
  words: string[];
  exchanges: number;
  corrections: { original: string; corrected: string; explanation: string }[];
  focus?: string;
};

export function fallbackProgressSummary(evidence: SummaryEvidence, language: string): ProgressSummary {
  const ui = getMessages(language).intelligence;
  const area = ui.areas[evidence.focus as keyof typeof ui.areas];
  return {
    vocabulary: formatMessage(ui.wordsReviewed, { count: evidence.words.length }),
    grammar: evidence.activity === "lesson" ? ui.grammarReviewed
      : formatMessage(ui.conversationReviewed, { count: evidence.corrections.length }),
    speaking: evidence.activity === "lesson" ? ui.speakingPracticed
      : formatMessage(ui.exchanges, { count: evidence.exchanges }),
    tomorrow: area ? formatMessage(ui.next, { area }) : ui.nextDefault,
  };
}

export function parseStoredSummary(value?: string | null): ProgressSummary | undefined {
  try { return progressSummarySchema.parse(JSON.parse(value ?? "")); } catch { return undefined; }
}
