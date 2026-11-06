import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import {
  conversationMessages,
  conversations,
  dailyLessons,
  mistakes,
} from "@/lib/db/schema";
import { getLocalDateKey } from "@/lib/daily/date";
import { countWeakAreas } from "@/lib/mistakes/model";
import { buildProgressSummary, type PracticeActivity } from "@/lib/progress/model";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LessonRow = { id: string; date: string };
type ConversationRow = { id: string; topic: string };
type MessageRow = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  requestId: string | null;
  createdAt: string;
};

type ProgressRows = {
  lessons: LessonRow[];
  conversations: ConversationRow[];
  messages: MessageRow[];
  mistakes: { category: string }[];
};

/** The MySQL DATETIME string is UTC; avoid host-local timezone interpretation. */
export function mysqlTimestampToIso(value: string): string {
  const match =
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?$/.exec(value);
  if (!match) throw new Error("Unexpected database timestamp.");
  const iso = `${match[1]}T${match[2]}.${(match[3] ?? "").padEnd(3, "0")}Z`;
  if (Number.isNaN(Date.parse(iso))) throw new Error("Unexpected database timestamp.");
  return iso;
}

/** Pure mapping layer: intentionally preserves the current progress UI contract. */
export function buildMySqlProgressData(
  rows: ProgressRows,
  timezone: string,
  today: Date = new Date(),
) {
  const userRequests = new Set(
    rows.messages
      .filter((message) => message.role === "user" && message.requestId)
      .map((message) => `${message.conversationId}:${message.requestId}`),
  );
  const pairedAssistantMessages = rows.messages.filter(
    (message) =>
      message.role === "assistant" &&
      message.requestId &&
      userRequests.has(`${message.conversationId}:${message.requestId}`),
  );

  const activities: PracticeActivity[] = [
    ...rows.lessons.map((lesson) => ({
      type: "daily_lesson" as const,
      occurredAt: lesson.date,
    })),
    ...pairedAssistantMessages.map((message) => ({
      type: "conversation" as const,
      occurredAt: mysqlTimestampToIso(message.createdAt),
    })),
  ];

  const summary = buildProgressSummary({
    activities,
    timezone,
    totalCompletedLessons: rows.lessons.length,
    today,
  });

  const topicCounts = rows.conversations
    .map((conversation) => ({
      topic: conversation.topic,
      count: pairedAssistantMessages.filter(
        (message) => message.conversationId === conversation.id,
      ).length,
    }))
    .filter((entry) => entry.count > 0)
    .reduce<Map<string, number>>((counts, entry) => {
      counts.set(entry.topic, (counts.get(entry.topic) ?? 0) + 1);
      return counts;
    }, new Map());

  const recentActivity = [
    ...rows.lessons.slice(0, 8).map((lesson) => ({
      id: `lesson-${lesson.id}`,
      type: "daily_lesson" as const,
      title: "Completed daily lesson",
      occurred_at: lesson.date,
    })),
    ...pairedAssistantMessages.slice(-8).map((message) => ({
      id: `conversation-${message.id}`,
      type: "conversation" as const,
      title: "Completed conversation exchange",
      occurred_at: getLocalDateKey(
        new Date(mysqlTimestampToIso(message.createdAt)),
        timezone,
      ),
    })),
  ]
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, 8);

  return {
    summary,
    topicCounts: Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count),
    recentActivity,
    weakAreas: countWeakAreas(rows.mistakes).slice(0, 3),
  };
}

/**
 * Load progress for a server-verified Better Auth application user.
 * All four queries bind the same authenticated appUserId.
 * Never call this with an arbitrary client-supplied UUID.
 */
export async function getMySqlProgressData(appUserId: string, timezone: string) {
  if (!UUID_PATTERN.test(appUserId)) {
    throw new Error("Invalid application identity.");
  }
  const db = getMySqlDatabase();
  const [lessons, conversationRows, messages, mistakeRows] = await Promise.all([
    db.select({ id: dailyLessons.id, date: dailyLessons.date })
      .from(dailyLessons)
      .where(and(eq(dailyLessons.userId, appUserId), eq(dailyLessons.completed, 1)))
      .orderBy(desc(dailyLessons.date)),
    db.select({ id: conversations.id, topic: conversations.topic })
      .from(conversations)
      .where(eq(conversations.userId, appUserId))
      .orderBy(desc(conversations.updatedAt)),
    db.select({
      id: conversationMessages.id,
      conversationId: conversationMessages.conversationId,
      role: conversationMessages.role,
      requestId: conversationMessages.requestId,
      createdAt: conversationMessages.createdAt,
    })
      .from(conversationMessages)
      .where(eq(conversationMessages.userId, appUserId))
      .orderBy(asc(conversationMessages.createdAt)),
    db.select({ category: mistakes.category })
      .from(mistakes)
      .where(and(eq(mistakes.userId, appUserId), isNull(mistakes.dismissedAt))),
  ]);

  return buildMySqlProgressData({
    lessons,
    conversations: conversationRows,
    messages,
    mistakes: mistakeRows,
  }, timezone);
}
