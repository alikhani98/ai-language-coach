import { buildAnalysisPrompt, mistakeAnalysisSchemaHint } from "@/lib/ai/prompts/analysis";
import { coachRole } from "@/lib/ai/prompts/context";
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
          coachRole,
      },
      {
        role: "user",
        content: buildAnalysisPrompt(input),
      },
    ],
  });

  return mistakeAnalysisSchema.parse(rawAnalysis);
}
