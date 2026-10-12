"use server";

import { requireProfile } from "@/lib/actions/profile";
import { getLocalDateKey } from "@/lib/daily/date";
import { countWeakAreas } from "@/lib/mistakes/model";
import {
  buildProgressSummary,
  type PracticeActivity,
} from "@/lib/progress/model";
import { createClient } from "@/lib/supabase/server";

export type RecentActivity = {
  id: string;
  type: "daily_lesson" | "conversation";
  title: string;
  occurred_at: string;
};

export async function getProgressData() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [lessonsResult, conversationsResult, messagesResult, mistakesResult] =
    await Promise.all([
      supabase
        .from("daily_lessons")
        .select("id,date,completed,created_at")
        .eq("user_id", profile.user_id)
        .eq("completed", true)
        .order("date", { ascending: false }),
      supabase
        .from("conversations")
        .select("id,topic,created_at,updated_at")
        .eq("user_id", profile.user_id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("conversation_messages")
        .select("id,conversation_id,role,request_id,created_at")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: true }),
      supabase
        .from("mistakes")
        .select("category")
        .eq("user_id", profile.user_id)
        .is("dismissed_at", null),
    ]);

  for (const result of [
    lessonsResult,
    conversationsResult,
    messagesResult,
    mistakesResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const completedLessons =
    lessonsResult.data?.map(
      (lesson: { id: string; date: string; created_at: string }) => lesson,
    ) ?? [];
  const messages =
    messagesResult.data?.map(
      (message: {
        id: string;
        conversation_id: string;
        role: string;
        request_id: string | null;
        created_at: string;
      }) => message,
    ) ?? [];
  const conversations =
    conversationsResult.data?.map(
      (conversation: {
        id: string;
        topic: string;
        created_at: string;
        updated_at: string;
      }) => conversation,
    ) ?? [];

  const userRequests = new Set(
    messages
      .filter((message) => message.role === "user" && message.request_id)
      .map((message) => `${message.conversation_id}:${message.request_id}`),
  );
  const validAssistantMessages = messages.filter(
    (message) =>
      message.role === "assistant" &&
      message.request_id &&
      userRequests.has(`${message.conversation_id}:${message.request_id}`),
  );
  const activities: PracticeActivity[] = [
    ...completedLessons.map((lesson) => ({
      type: "daily_lesson" as const,
      occurredAt: lesson.date,
    })),
    ...validAssistantMessages.map((message) => ({
      type: "conversation" as const,
      occurredAt: message.created_at,
    })),
  ];
  const summary = buildProgressSummary({
    activities,
    timezone: profile.timezone,
    totalCompletedLessons: completedLessons.length,
  });
  const topicCounts = conversations
    .map((conversation) => ({
      ...conversation,
      count: validAssistantMessages.filter(
        (message) => message.conversation_id === conversation.id,
      ).length,
    }))
    .filter((conversation) => conversation.count > 0)
    .reduce<Map<string, number>>((counts, conversation) => {
      counts.set(conversation.topic, (counts.get(conversation.topic) ?? 0) + 1);
      return counts;
    }, new Map());
  const recentActivity: RecentActivity[] = [
    ...completedLessons.slice(0, 8).map((lesson) => ({
      id: `lesson-${lesson.id}`,
      type: "daily_lesson" as const,
      title: "Completed daily lesson",
      occurred_at: lesson.date,
    })),
    ...validAssistantMessages.slice(-8).map((message) => ({
      id: `conversation-${message.id}`,
      type: "conversation" as const,
      title: "Completed conversation exchange",
      occurred_at: getLocalDateKey(new Date(message.created_at), profile.timezone),
    })),
  ]
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))
    .slice(0, 8);

  return {
    summary,
    topicCounts: Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((left, right) => right.count - left.count),
    recentActivity,
    weakAreas: countWeakAreas(
      (mistakesResult.data ?? []) as Array<{ category: string }>,
    ).slice(0, 3),
  };
}
