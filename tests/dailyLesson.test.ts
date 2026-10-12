import { describe, expect, it } from "vitest";
import { getLocalDateKey } from "@/lib/daily/date";
import {
  canCompleteLesson,
  isCompletionIdempotent,
  isLessonOwnedByUser,
  isProfileComplete,
  isUniqueConflict,
  parseLessonContent,
  shouldReuseLesson,
} from "@/lib/daily/lesson";

const validContent = {
  words: [
    {
      word: "prepare",
      meaning: "to make something ready",
      example: "I prepare my notes before the meeting.",
    },
    {
      word: "clear",
      meaning: "easy to understand",
      example: "Her explanation was clear.",
    },
    {
      word: "steady",
      meaning: "regular and controlled",
      example: "A steady habit helps you improve.",
    },
  ],
  sentence: "I would like to explain my idea clearly.",
  reading:
    "Mina practices English for a short time every morning. She reads one small paragraph, learns a few useful words, and says one sentence aloud. The routine is simple, so she can repeat it even on busy days.",
  speakingTask:
    "Speak aloud for one minute about one small plan you have for today. Use the sentence from this lesson once.",
};

describe("daily lesson helpers", () => {
  it("reuses a ready same-day lesson without requiring generation", () => {
    expect(shouldReuseLesson({ generation_status: "ready" })).toBe(true);
    expect(shouldReuseLesson({ generation_status: "pending" })).toBe(false);
  });

  it("recognizes database uniqueness conflicts for concurrent generation", () => {
    expect(isUniqueConflict({ code: "23505" })).toBe(true);
    expect(isUniqueConflict({ code: "PGRST116" })).toBe(false);
  });

  it("rejects invalid lesson schema output before persistence", () => {
    expect(() => parseLessonContent({ ...validContent, words: [] })).toThrow();
    expect(parseLessonContent(validContent).words).toHaveLength(3);
  });

  it("keeps completion idempotent for already completed ready lessons", () => {
    expect(
      canCompleteLesson({ completed: false, generation_status: "ready" }),
    ).toBe(true);
    expect(
      isCompletionIdempotent({ completed: true, generation_status: "ready" }),
    ).toBe(true);
    expect(
      canCompleteLesson({ completed: false, generation_status: "pending" }),
    ).toBe(false);
  });

  it("treats missing or incomplete profile data as not onboarded", () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(
      isProfileComplete({
        level: "b1_intermediate",
        goal: "work",
        daily_minutes: 15,
        timezone: "Asia/Tehran",
      }),
    ).toBe(true);
    expect(
      isProfileComplete({
        level: "b1_intermediate",
        goal: "work",
        daily_minutes: 20,
        timezone: "Asia/Tehran",
      }),
    ).toBe(false);
  });

  it("uses the requested timezone for local date boundaries", () => {
    const instant = new Date("2026-10-11T21:00:00.000Z");

    expect(getLocalDateKey(instant, "UTC")).toBe("2026-10-11");
    expect(getLocalDateKey(instant, "Asia/Tehran")).toBe("2026-10-12");
  });

  it("does not authorize completion when no lesson is available", () => {
    expect(canCompleteLesson(null)).toBe(false);
  });

  it("keeps user isolation decisions tied to the authenticated user id", () => {
    expect(isLessonOwnedByUser({ user_id: "user-a" }, "user-a")).toBe(true);
    expect(isLessonOwnedByUser({ user_id: "user-a" }, "user-b")).toBe(false);
    expect(isLessonOwnedByUser({ user_id: "user-a" }, null)).toBe(false);
  });

  it("keeps failed AI generation retryable but not completable", () => {
    expect(shouldReuseLesson({ generation_status: "failed" })).toBe(false);
    expect(
      canCompleteLesson({ completed: false, generation_status: "failed" }),
    ).toBe(false);
  });
});
