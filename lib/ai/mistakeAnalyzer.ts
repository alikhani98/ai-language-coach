import { getAIProvider } from "@/lib/ai/provider";
import { mistakeAnalysisSchema } from "@/lib/validations/mistake";

export type MistakeCategory =
  | "grammar"
  | "vocabulary"
  | "pronunciation"
  | "fluency"
  | "word_order"
  | "other";

export type MistakeAnalysis = {
  correctSentence: string;
  explanation: string;
  category: MistakeCategory;
};

export type MistakeAnalysisInput = {
  sentence: string;
  context?: string;
  interfaceLanguage?: string;
};

const mistakeAnalysisSchemaHint = JSON.stringify({
  correctSentence: "string",
  explanation: "string",
  category: "grammar | vocabulary | pronunciation | fluency | word_order | other",
});

export async function analyzeMistake(
  input: MistakeAnalysisInput,
): Promise<MistakeAnalysis> {
  const rawAnalysis = await getAIProvider().analyzeMistake({
    temperature: 0.2,
    maxTokens: 400,
    schemaName: "mistake_analysis",
    schemaHint: mistakeAnalysisSchemaHint,
    messages: [
      {
        role: "system",
        content:
          "You are an English language coach. Analyze only the learner sentence and return valid JSON.",
      },
      {
        role: "user",
        content: [
          "Learner sentence:",
          input.sentence,
          "",
          "Context:",
          input.context ?? "No extra context.",
          "",
          `Interface language: ${input.interfaceLanguage ?? "en"}.`,
          input.interfaceLanguage === "fa"
            ? "The explanation may be Persian, but the corrected sentence must stay English."
            : "The explanation should remain English.",
          "",
          "Correct the sentence if needed and explain the most important issue.",
        ].join("\n"),
      },
    ],
  });

  return mistakeAnalysisSchema.parse(rawAnalysis);
}
