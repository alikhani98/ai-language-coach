"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/actions/profile";
import { syncCorrectionsForMessage } from "@/lib/actions/mistakes";
import { getConversationCoachReply } from "@/lib/ai/conversationCoach";
import {
  conversationColumns,
  conversationMessageColumns,
  hasAssistantResponseForRequest,
  isDuplicateRequest,
  isGenerationLockStale,
  mapConversationMessageRow,
  mapConversationRow,
  type Conversation,
  type ConversationThread,
} from "@/lib/conversation/model";
import { createClient } from "@/lib/supabase/server";
import {
  conversationIdSchema,
  conversationMessageInputSchema,
  conversationTopicSchema,
} from "@/lib/validations/conversation";

type ConversationActionState = {
  conversationId?: string;
  thread?: ConversationThread | null;
  error?: string;
  success?: string;
};

const maxMessagesPerConversation = 60;
const maxUserMessagesPerMinute = 6;

function nowIso() {
  return new Date().toISOString();
}

function parseFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function fetchConversation(userId: string, conversationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(conversationColumns)
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapConversationRow(data) : null;
}

async function fetchMessages(userId: string, conversationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversation_messages")
    .select(conversationMessageColumns)
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapConversationMessageRow);
}

async function fetchThread(userId: string, conversationId: string) {
  const conversation = await fetchConversation(userId, conversationId);

  if (!conversation) {
    return null;
  }

  return {
    conversation,
    messages: await fetchMessages(userId, conversationId),
  };
}

async function getConversationContext(conversationId: string) {
  const profile = await requireProfile();
  const thread = await fetchThread(profile.user_id, conversationId);

  if (!thread) {
    throw new Error("Conversation was not found.");
  }

  return { profile, thread };
}

async function countRecentUserMessages(userId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 60000).toISOString();
  const { count, error } = await supabase
    .from("conversation_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", since);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function claimGeneration(conversation: Conversation, requestId: string) {
  const supabase = await createClient();

  if (
    conversation.active_request_id &&
    conversation.active_request_id !== requestId &&
    !isGenerationLockStale(conversation.active_generation_started_at)
  ) {
    return false;
  }

  let query = supabase
    .from("conversations")
    .update({
      active_request_id: requestId,
      active_generation_started_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", conversation.id)
    .eq("user_id", conversation.user_id)
    .eq("status", "active")
    .select("id");

  query = conversation.active_request_id
    ? query.eq("active_request_id", conversation.active_request_id)
    : query.is("active_request_id", null);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.length);
}

async function releaseGeneration(conversation: Conversation, requestId: string) {
  const supabase = await createClient();
  await supabase
    .from("conversations")
    .update({
      active_request_id: null,
      active_generation_started_at: null,
      updated_at: nowIso(),
    })
    .eq("id", conversation.id)
    .eq("user_id", conversation.user_id)
    .eq("active_request_id", requestId);
}

export async function listRecentConversations() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(conversationColumns)
    .eq("user_id", profile.user_id)
    .order("updated_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapConversationRow);
}

export async function getConversation(conversationId: string) {
  const parsed = conversationIdSchema.safeParse(conversationId);

  if (!parsed.success) {
    return null;
  }

  const profile = await requireProfile();
  return fetchThread(profile.user_id, parsed.data);
}

export async function startConversation(
  previousState: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  void previousState;
  const profile = await requireProfile();
  const parsed = conversationTopicSchema.safeParse(parseFormString(formData, "topic"));

  if (!parsed.success) {
    return { error: "Choose a conversation topic." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: profile.user_id,
      topic: parsed.data,
      messages: [],
      status: "active",
      updated_at: nowIso(),
    })
    .select(conversationColumns)
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/conversation");

  const conversation = mapConversationRow(data);

  return {
    conversationId: conversation.id,
    thread: { conversation, messages: [] },
    success: "Conversation started.",
  };
}

export async function sendConversationMessage(
  previousState: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  void previousState;
  const parsed = conversationMessageInputSchema.safeParse({
    conversationId: formData.get("conversationId"),
    text: formData.get("text"),
    requestId: formData.get("requestId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your message." };
  }

  const { profile, thread } = await getConversationContext(
    parsed.data.conversationId,
  );

  if (thread.conversation.status === "ended") {
    return { thread, error: "This conversation has ended." };
  }

  const duplicateUserMessage = isDuplicateRequest(
    thread.messages,
    parsed.data.requestId,
  );

  if (
    duplicateUserMessage &&
    hasAssistantResponseForRequest(thread.messages, parsed.data.requestId)
  ) {
    return {
      thread,
      success: "This message was already answered.",
    };
  }

  if (
    duplicateUserMessage &&
    thread.conversation.active_request_id === parsed.data.requestId
  ) {
    return {
      thread,
      error: "This message is already being answered.",
    };
  }

  if (!duplicateUserMessage && thread.messages.length >= maxMessagesPerConversation) {
    return {
      thread,
      error: "This conversation is full. Start a new one to continue.",
    };
  }

  if (!duplicateUserMessage) {
    const recentCount = await countRecentUserMessages(profile.user_id);

    if (recentCount >= maxUserMessagesPerMinute) {
      return {
        thread,
        error: "Please slow down for a moment before sending another message.",
      };
    }
  }

  const claimed = await claimGeneration(
    thread.conversation,
    parsed.data.requestId,
  );

  if (!claimed) {
    return {
      thread,
      error:
        "The coach is still answering the previous message. Try again in a moment.",
    };
  }

  const supabase = await createClient();

  try {
    if (!duplicateUserMessage) {
      const { error } = await supabase.from("conversation_messages").insert({
        conversation_id: thread.conversation.id,
        user_id: profile.user_id,
        role: "user",
        content: parsed.data.text,
        corrections: [],
        request_id: parsed.data.requestId,
      });

      if (error) {
        throw new Error(error.message);
      }
    }

    const contextMessages = thread.messages
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const coachResponse = await getConversationCoachReply({
      profile: {
        level: profile.level,
        goal: profile.goal,
      },
      topic: thread.conversation.topic,
      recentMessages: contextMessages,
      userMessage: parsed.data.text,
    });

    const { data: assistantMessageId, error: assistantError } = await supabase.rpc(
      "insert_assistant_conversation_message",
      {
        p_conversation_id: thread.conversation.id,
        p_content: coachResponse.reply,
        p_corrections: coachResponse.corrections,
        p_request_id: parsed.data.requestId,
      },
    );

    if (assistantError && assistantError.code !== "23505") {
      throw new Error(assistantError.message);
    }

    if (typeof assistantMessageId === "string") {
      await syncCorrectionsForMessage(assistantMessageId);
    }

    await releaseGeneration(thread.conversation, parsed.data.requestId);
    revalidatePath("/conversation");
    revalidatePath("/mistakes");
    revalidatePath("/progress");
    revalidatePath("/dashboard");

    return {
      thread: await fetchThread(profile.user_id, thread.conversation.id),
      success: "Coach replied.",
    };
  } catch (error) {
    await releaseGeneration(thread.conversation, parsed.data.requestId);

    return {
      thread: await fetchThread(profile.user_id, thread.conversation.id),
      error:
        error instanceof Error
          ? error.message
          : "The coach could not answer. Try again.",
    };
  }
}

export async function endConversation(
  previousState: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  void previousState;
  const parsed = conversationIdSchema.safeParse(
    parseFormString(formData, "conversationId"),
  );

  if (!parsed.success) {
    return { error: "Conversation was not found." };
  }

  const { profile, thread } = await getConversationContext(parsed.data);
  const supabase = await createClient();

  if (thread.conversation.status === "ended") {
    return { thread, success: "Conversation already ended." };
  }

  const endedAt = nowIso();
  const { data, error } = await supabase
    .from("conversations")
    .update({
      status: "ended",
      active_request_id: null,
      active_generation_started_at: null,
      ended_at: endedAt,
      updated_at: endedAt,
    })
    .eq("id", thread.conversation.id)
    .eq("user_id", profile.user_id)
    .select(conversationColumns)
    .single();

  if (error) {
    return { thread, error: error.message };
  }

  revalidatePath("/conversation");

  return {
    thread: {
      conversation: mapConversationRow(data),
      messages: thread.messages,
    },
    success: "Conversation ended.",
  };
}
