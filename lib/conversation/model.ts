import { z } from "zod";
import {
  conversationCorrectionSchema,
  conversationTopicSchema,
  type ConversationCorrection,
  type ConversationTopic,
} from "@/lib/validations/conversation";

export const conversationStatusSchema = z.enum(["active", "ended"]);
export const conversationRoleSchema = z.enum(["user", "assistant"]);

export type ConversationStatus = z.infer<typeof conversationStatusSchema>;
export type ConversationRole = z.infer<typeof conversationRoleSchema>;

export type Conversation = {
  id: string;
  user_id: string;
  topic: ConversationTopic;
  feedback?: string | null;
  status: ConversationStatus;
  active_request_id: string | null;
  active_generation_started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ConversationRole;
  content: string;
  corrections: ConversationCorrection[];
  request_id: string | null;
  created_at: string;
};

export type ConversationThread = {
  conversation: Conversation;
  messages: ConversationMessage[];
};

export const conversationColumns =
  "id,user_id,topic,feedback,status,active_request_id,active_generation_started_at,ended_at,created_at,updated_at";

export const conversationMessageColumns =
  "id,conversation_id,user_id,role,content,corrections,request_id,created_at";

export function mapConversationRow(row: Record<string, unknown>): Conversation {
  return {
    id: z.string().parse(row.id),
    user_id: z.string().parse(row.user_id),
    topic: conversationTopicSchema.parse(row.topic),
    feedback: z.string().nullable().parse(row.feedback ?? null),
    status: conversationStatusSchema.parse(row.status ?? "active"),
    active_request_id: z.string().nullable().parse(row.active_request_id ?? null),
    active_generation_started_at: z
      .string()
      .nullable()
      .parse(row.active_generation_started_at ?? null),
    ended_at: z.string().nullable().parse(row.ended_at ?? null),
    created_at: z.string().parse(row.created_at),
    updated_at: z.string().parse(row.updated_at ?? row.created_at),
  };
}

export function mapConversationMessageRow(
  row: Record<string, unknown>,
): ConversationMessage {
  return {
    id: z.string().parse(row.id),
    conversation_id: z.string().parse(row.conversation_id),
    user_id: z.string().parse(row.user_id),
    role: conversationRoleSchema.parse(row.role),
    content: z.string().parse(row.content),
    corrections: z.array(conversationCorrectionSchema).parse(row.corrections),
    request_id: z.string().nullable().parse(row.request_id ?? null),
    created_at: z.string().parse(row.created_at),
  };
}

export function isConversationOwnedByUser(
  conversation: { user_id: string } | null,
  userId: string | null,
) {
  return Boolean(conversation && userId && conversation.user_id === userId);
}

export function isConversationEnded(conversation: {
  status: ConversationStatus;
}) {
  return conversation.status === "ended";
}

export function isDuplicateRequest(
  messages: Array<{ request_id: string | null; role: ConversationRole }>,
  requestId: string,
) {
  return messages.some(
    (message) => message.role === "user" && message.request_id === requestId,
  );
}

export function hasAssistantResponseForRequest(
  messages: Array<{ request_id: string | null; role: ConversationRole }>,
  requestId: string,
) {
  return messages.some(
    (message) =>
      message.role === "assistant" && message.request_id === requestId,
  );
}

export function isGenerationLockStale(
  startedAt: string | null,
  now = new Date(),
  staleAfterMs = 120000,
) {
  if (!startedAt) return false;

  return now.getTime() - new Date(startedAt).getTime() > staleAfterMs;
}
