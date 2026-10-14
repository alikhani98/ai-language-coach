import type { MistakeAnalysisInput } from "@/lib/ai/mistakeAnalyzer";
export const mistakeAnalysisSchemaHint = JSON.stringify({
  correctSentence: "string",
  explanation: "string",
  category: "grammar | vocabulary | pronunciation | fluency | word_order | other",
});


export function buildAnalysisPrompt(input: MistakeAnalysisInput) { return [
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
        ].join("\n"); }
