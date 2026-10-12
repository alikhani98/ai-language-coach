import { z } from "zod";

export const conversationTopics = [
  "daily_life",
  "work",
  "travel",
  "hobbies",
  "free_conversation",
] as const;

export const conversationTopicSchema = z.enum(conversationTopics);

export const conversationMessageInputSchema = z.object({
  conversationId: z.string().uuid(),
  text: z.string().trim().min(1, "Write a message first.").max(800),
  requestId: z.string().trim().min(8).max(120),
});

export const conversationIdSchema = z.string().uuid();

export const correctionCategorySchema = z.enum([
  "grammar",
  "vocabulary",
  "word_order",
  "tone",
  "clarity",
  "other",
]);

export const conversationCorrectionSchema = z.object({
  original: z.string().min(1).max(240),
  corrected: z.string().min(1).max(240),
  explanation: z.string().min(1).max(320),
  category: correctionCategorySchema,
});

export const conversationCoachResponseSchema = z.object({
  reply: z.string().min(1).max(900),
  corrections: z.array(conversationCorrectionSchema).max(2),
});

export type ConversationTopic = z.infer<typeof conversationTopicSchema>;
export type ConversationCorrection = z.infer<
  typeof conversationCorrectionSchema
>;
export type ConversationCoachResponse = z.infer<
  typeof conversationCoachResponseSchema
>;
