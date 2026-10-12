import { describe, expect, it } from "vitest";
import {
  hasAssistantResponseForRequest,
  isConversationEnded,
  isConversationOwnedByUser,
  isDuplicateRequest,
  isGenerationLockStale,
} from "@/lib/conversation/model";
import {
  conversationCoachResponseSchema,
  conversationMessageInputSchema,
  conversationTopicSchema,
} from "@/lib/validations/conversation";

describe("conversation validation and concurrency helpers", () => {
  it("accepts fixed conversation topics and rejects unknown topics", () => {
    expect(conversationTopicSchema.safeParse("work").success).toBe(true);
    expect(conversationTopicSchema.safeParse("random_topic").success).toBe(false);
  });

  it("rejects empty or overlong user messages", () => {
    expect(
      conversationMessageInputSchema.safeParse({
        conversationId: "00000000-0000-4000-8000-000000000000",
        text: "",
        requestId: "request-123",
      }).success,
    ).toBe(false);
    expect(
      conversationMessageInputSchema.safeParse({
        conversationId: "00000000-0000-4000-8000-000000000000",
        text: "hello",
        requestId: "request-123",
      }).success,
    ).toBe(true);
  });

  it("validates structured AI responses with empty or bounded corrections", () => {
    expect(
      conversationCoachResponseSchema.parse({
        reply: "That sounds nice. What did you do next?",
        corrections: [],
      }).corrections,
    ).toEqual([]);
    expect(
      conversationCoachResponseSchema.safeParse({
        reply: "I understand. What happened yesterday?",
        corrections: [
          {
            original: "I go yesterday",
            corrected: "I went yesterday",
            explanation: "Use past tense with yesterday.",
            category: "grammar",
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      conversationCoachResponseSchema.safeParse({
        reply: "Good.",
        corrections: [
          {
            original: "a",
            corrected: "b",
            explanation: "one",
            category: "grammar",
          },
          {
            original: "c",
            corrected: "d",
            explanation: "two",
            category: "grammar",
          },
          {
            original: "e",
            corrected: "f",
            explanation: "three",
            category: "grammar",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("keeps message ordering stable by sorted created time then id", () => {
    const messages = [
      { id: "b", created_at: "2026-10-12T08:00:00.000Z" },
      { id: "a", created_at: "2026-10-12T08:00:00.000Z" },
      { id: "c", created_at: "2026-10-12T08:01:00.000Z" },
    ].sort(
      (left, right) =>
        left.created_at.localeCompare(right.created_at) ||
        left.id.localeCompare(right.id),
    );

    expect(messages.map((message) => message.id)).toEqual(["a", "b", "c"]);
  });

  it("deduplicates repeated request ids and detects assistant completion", () => {
    const messages = [
      { role: "user" as const, request_id: "req-1" },
      { role: "assistant" as const, request_id: "req-1" },
    ];

    expect(isDuplicateRequest(messages, "req-1")).toBe(true);
    expect(hasAssistantResponseForRequest(messages, "req-1")).toBe(true);
    expect(isDuplicateRequest(messages, "req-2")).toBe(false);
  });

  it("detects active generation locks and stale recovery windows", () => {
    expect(
      isGenerationLockStale(
        "2026-10-12T08:00:00.000Z",
        new Date("2026-10-12T08:03:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isGenerationLockStale(
        "2026-10-12T08:00:00.000Z",
        new Date("2026-10-12T08:00:30.000Z"),
      ),
    ).toBe(false);
  });

  it("enforces ownership and ended conversation decisions", () => {
    expect(isConversationOwnedByUser({ user_id: "user-a" }, "user-a")).toBe(
      true,
    );
    expect(isConversationOwnedByUser({ user_id: "user-a" }, "user-b")).toBe(
      false,
    );
    expect(isConversationEnded({ status: "ended" })).toBe(true);
    expect(isConversationEnded({ status: "active" })).toBe(false);
  });
});
