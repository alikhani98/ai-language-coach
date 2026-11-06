import "server-only";

import { randomUUID } from "node:crypto";

import { and, count, eq, gte, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getMySqlDatabase } from "@/lib/db/client";
import { appUsers, usersProfile, conversations, conversationMessages } from "@/lib/db/schema";
import { requireProfile } from "@/lib/actions/profile";
import { loadLearnerContext } from "@/lib/learner/load";
import { refreshLearningMemory } from "@/lib/memory/load";
import { generateProgressSummary } from "@/lib/ai/progressCoach";
import { getConversationCoachReply } from "@/lib/ai/conversationCoach";
import { getMessages } from "@/lib/i18n/config";
import { isGenerationLockStale } from "@/lib/conversation/model";
import { conversationIdSchema, conversationMessageInputSchema } from "@/lib/validations/conversation";
import { formatMySqlUtcDateTime } from "@/lib/mysql/profile";
import { appendMySqlConversationExchange, getMySqlConversationThread } from "@/lib/mysql/conversation";
import { syncMySqlMessageCorrections } from "@/lib/mysql/mistakes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxMessages = 60;
const maxRequestsPerMinute = 6;
const maxParallelRequests = 2;

function utcSqlDateTime(date: Date) {
  return date.toISOString().slice(0, 23).replace("T", " ");
}

export type ClaimResult = { status: "claimed"; lease: string } | "unavailable" | "ended" | "busy" |
  "already-answered" | "full" | "slow";

/**
 * A MySQL transaction serializes requests per user by locking their app_users row.
 * This closes the cross-conversation rate-limit race and one-conversation lock race.
 * Expired generation locks can be safely reclaimed. Old workers cannot publish:
 * appendMySqlConversationExchange verifies lock ownership inside its transaction.
 */
export async function claimMySqlGeneration(
  appUserId: string, conversationId: string, requestId: string,
): Promise<ClaimResult> {
  const parsed = conversationMessageInputSchema.safeParse({
    conversationId, requestId, text: "validated-placeholder",
  });
  if (!parsed.success || !UUID.test(appUserId)) {
    return "unavailable";
  }
  const db = getMySqlDatabase();
  return db.transaction(async (tx): Promise<ClaimResult> => {
    // Locking the actor first gives all their message claims a stable lock order.
    const actors = await tx.select({ id: appUsers.id }).from(appUsers)
      .innerJoin(usersProfile, eq(usersProfile.userId, appUsers.id))
      .where(and(eq(appUsers.id, appUserId), eq(appUsers.authProvider, "better_auth"),
        eq(usersProfile.status, "active")))
      .for("update").limit(1);
    if (!actors.length) return "unavailable";

    const conv = await tx.select({
      id: conversations.id, status: conversations.status,
      activeRequestId: conversations.activeRequestId,
      activeGenerationStartedAt: conversations.activeGenerationStartedAt,
    }).from(conversations).where(and(eq(conversations.id, conversationId),
      eq(conversations.userId, appUserId))).for("update").limit(1);
    if (!conv.length) return "unavailable";
    if (conv[0].status === "ended") return "ended";

    const duplicate = await tx.select({ role: conversationMessages.role })
      .from(conversationMessages)
      .where(and(eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.userId, appUserId),
        eq(conversationMessages.requestId, requestId)))
      .limit(2);
    if (duplicate.some((message) => message.role === "assistant")) return "already-answered";
    if (duplicate.length) return "busy";

    if (conv[0].activeRequestId && !isGenerationLockStale(
      conv[0].activeGenerationStartedAt
        ? formatMySqlUtcDateTime(conv[0].activeGenerationStartedAt) : null,
    )) return "busy";

    const [total] = await tx.select({ value: count() }).from(conversationMessages)
      .where(and(eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.userId, appUserId)));
    if (Number(total?.value ?? 0) + 2 > maxMessages) return "full";

    const minuteAgo = utcSqlDateTime(new Date(Date.now() - 60000));
    const [recent] = await tx.select({ value: count() }).from(conversationMessages)
      .where(and(eq(conversationMessages.userId, appUserId),
        eq(conversationMessages.role, "user"),
        gte(conversationMessages.createdAt, minuteAgo)));
    const [parallel] = await tx.select({ value: count() }).from(conversations)
      .where(and(eq(conversations.userId, appUserId),
        isNotNull(conversations.activeRequestId),
        gte(conversations.activeGenerationStartedAt, utcSqlDateTime(new Date(Date.now() - 120000)))));
    if (Number(recent?.value ?? 0) + Number(parallel?.value ?? 0) >= maxRequestsPerMinute ||
        Number(parallel?.value ?? 0) >= maxParallelRequests) return "slow";

    const lease = randomUUID();
    await tx.update(conversations).set({
      activeRequestId: lease,
      activeGenerationStartedAt: utcSqlDateTime(new Date()),
    }).where(and(eq(conversations.id, conversationId), eq(conversations.userId, appUserId)));
    return { status: "claimed", lease };
  });
}

export async function releaseMySqlGeneration(
  appUserId: string, conversationId: string, lease: string,
) {
  if (!UUID.test(appUserId) || !UUID.test(lease) ||
      !conversationIdSchema.safeParse(conversationId).success) return;
  await getMySqlDatabase().update(conversations)
    .set({ activeRequestId: null, activeGenerationStartedAt: null })
    .where(and(eq(conversations.id, conversationId),
      eq(conversations.userId, appUserId), eq(conversations.activeRequestId, lease)));
}

/** Handles complete generation flow; never falls back to Supabase on failure. */
export async function sendMySqlPreviewMessage(formData: FormData) {
  const parsed = conversationMessageInputSchema.safeParse({
    conversationId: formData.get("conversationId"),
    text: formData.get("text"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your message." };

  const profile = await requireProfile();
  const m = getMessages(profile.interface_language).actions;
  const { conversationId, requestId, text } = parsed.data;
  let claimed: ClaimResult;
  try {
    claimed = await claimMySqlGeneration(profile.user_id, conversationId, requestId);
  } catch { return { error: m.conversationReplyFailed }; }

  if (claimed === "already-answered") {
    return { thread: await getMySqlConversationThread(profile.user_id, conversationId),
      success: m.conversationAlreadyAnswered };
  }
  if (typeof claimed === "string") {
    const error = claimed === "ended" ? m.conversationEnded :
      claimed === "full" ? m.conversationFull :
      claimed === "slow" ? m.conversationSlowDown :
      claimed === "busy" ? m.conversationPreviousAnswering : m.conversationReplyFailed;
    return { error };
  }

  try {
    const thread = await getMySqlConversationThread(profile.user_id, conversationId);
    if (!thread || thread.conversation.status !== "active") throw new Error("Conversation unavailable.");
    const context = await loadLearnerContext(profile);
    const response = await getConversationCoachReply({
      learnerContext: context,
      profile: { level: profile.level, goal: profile.goal, interfaceLanguage: profile.interface_language },
      topic: thread.conversation.topic,
      recentMessages: thread.messages.map((message) => ({ role: message.role, content: message.content })),
      userMessage: text,
    });
    await appendMySqlConversationExchange(profile.user_id, {
      conversationId, requestId, text,
      reply: response.reply, corrections: response.corrections,
    }, claimed.lease);

    const saved = await getMySqlConversationThread(profile.user_id, conversationId);
    // Corrections are optional post-commit enrichment, never cause AI replay.
    const assistant = saved?.messages.find((message) => message.role === "assistant" && message.request_id === requestId);
    if (assistant) {
      try { await syncMySqlMessageCorrections(profile.user_id, assistant.id); } catch { /* retryable */ }
    }
    try { await refreshLearningMemory(profile); } catch { /* optional */ }
    for (const path of ["/conversation", "/mistakes", "/progress", "/dashboard"]) revalidatePath(path);
    return { thread: saved, success: m.conversationReplied };
  } catch {
    // The lock is scoped to exactly this request. Never delete someone else's lock.
    try { await releaseMySqlGeneration(profile.user_id, conversationId, claimed.lease); } catch { /* lock expires */ }
    return { error: m.conversationReplyFailed };
  }
}

/** End an owned conversation only when no non-stale generation is in progress. */
export async function endMySqlPreviewConversation(formData: FormData) {
  const parsed = conversationIdSchema.safeParse(formData.get("conversationId"));
  if (!parsed.success) return { error: "Conversation was not found." };
  const profile = await requireProfile();
  const m = getMessages(profile.interface_language).actions;
  const id = parsed.data;
  let state: "ended" | "already" | "busy" | "missing";
  try {
    state = await getMySqlDatabase().transaction(async (tx): Promise<"ended" | "already" | "busy" | "missing"> => {
      const rows = await tx.select({ status: conversations.status,
        activeRequestId: conversations.activeRequestId,
        activeGenerationStartedAt: conversations.activeGenerationStartedAt,
      }).from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, profile.user_id)))
        .for("update").limit(1);
      if (!rows.length) return "missing";
      if (rows[0].status === "ended") return "already";
      if (rows[0].activeRequestId && !isGenerationLockStale(
        rows[0].activeGenerationStartedAt ? formatMySqlUtcDateTime(rows[0].activeGenerationStartedAt) : null,
      )) return "busy";
      await tx.update(conversations).set({
        status: "ended", activeRequestId: null, activeGenerationStartedAt: null,
        endedAt: utcSqlDateTime(new Date()),
      }).where(and(eq(conversations.id, id), eq(conversations.userId, profile.user_id)));
      return "ended";
    });
  } catch { return { error: m.conversationPreviousAnswering }; }

  if (state === "missing") return { error: "Conversation was not found." };
  if (state === "busy") return { error: m.conversationPreviousAnswering };
  const thread = await getMySqlConversationThread(profile.user_id, id);
  if (state === "already") return { thread, success: m.conversationAlreadyEnded };

  if (thread) {
    try {
      const context = await loadLearnerContext(profile);
      const requested = new Set(thread.messages.filter(x => x.role === "user" && x.request_id).map(x => x.request_id));
      const answered = thread.messages.filter(x => x.role === "assistant" && x.request_id && requested.has(x.request_id));
      const summary = await generateProgressSummary(context, {
        activity: "conversation", words: [], exchanges: answered.length,
        corrections: answered.flatMap(x => x.corrections), focus: context.weakAreas[0],
      });
      await getMySqlDatabase().update(conversations).set({ feedback: JSON.stringify(summary) })
        .where(and(eq(conversations.id, id), eq(conversations.userId, profile.user_id),
          eq(conversations.status, "ended")));
    } catch { /* End remains durable even without feedback. */ }
  }
  try { await refreshLearningMemory(profile); } catch { /* optional */ }
  for (const path of ["/conversation", "/dashboard", "/progress"]) revalidatePath(path);
  return { thread: await getMySqlConversationThread(profile.user_id, id), success: m.conversationEndSuccess };
}
