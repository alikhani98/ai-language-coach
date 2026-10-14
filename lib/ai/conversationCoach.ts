import type { LearnerContext } from "@/lib/learner/context";
import { buildCoachPrompt, conversationSchemaHint } from "@/lib/ai/prompts/conversation";
import { coachRole } from "@/lib/ai/prompts/context";
import { getAIProvider } from "@/lib/ai/provider";
import {
  conversationCoachResponseSchema,
  type ConversationCoachResponse,
  type ConversationTopic,
} from "@/lib/validations/conversation";

export type ConversationCoachMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ConversationCoachInput = {
  learnerContext?: LearnerContext;
  profile: {
    level: string;
    goal: string;
    interfaceLanguage: string;
  };
  topic: ConversationTopic;
  recentMessages: ConversationCoachMessage[];
  userMessage: string;
};

export async function getConversationCoachReply(
  input: ConversationCoachInput,
): Promise<ConversationCoachResponse> {
  const rawResponse = await getAIProvider().generateConversationResponse({
    temperature: 0.5,
    maxTokens: 650,
    schemaName: "conversation_coach_response",
    schemaHint: conversationSchemaHint,
    messages: [
      {
        role: "system",
        content:
          coachRole,
      },
      {
        role: "user",
        content: buildCoachPrompt(input),
      },
    ],
  });

  return conversationCoachResponseSchema.parse(rawResponse);
}
