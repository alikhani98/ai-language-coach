import { z } from "zod";

export const mistakeIdSchema = z.string().uuid();

export const mistakeCategoryFilterSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .optional();

export const mistakeAnalysisSchema = z.object({
  correctSentence: z.string().min(1).max(240),
  explanation: z.string().min(1).max(320),
  category: z.enum([
    "grammar",
    "vocabulary",
    "pronunciation",
    "fluency",
    "word_order",
    "other",
  ]),
});

export type MistakeAnalysisResult = z.infer<typeof mistakeAnalysisSchema>;
