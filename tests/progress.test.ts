import { describe, expect, it } from "vitest";
import {
  buildProgressSummary,
  calculateCurrentStreak,
  uniquePracticeDays,
} from "@/lib/progress/model";

describe("progress calculations", () => {
  it("deduplicates multiple activities on one practice day", () => {
    expect(
      uniquePracticeDays(
        [
          { type: "daily_lesson", occurredAt: "2026-10-12" },
          { type: "conversation", occurredAt: "2026-10-12T08:00:00.000Z" },
          { type: "conversation", occurredAt: "2026-10-12T10:00:00.000Z" },
        ],
        "UTC",
      ),
    ).toEqual(["2026-10-12"]);
  });

  it("counts completed daily lessons and valid conversation exchanges as practice", () => {
    const summary = buildProgressSummary({
      activities: [
        { type: "daily_lesson", occurredAt: "2026-10-10" },
        { type: "conversation", occurredAt: "2026-10-11T09:00:00.000Z" },
      ],
      timezone: "UTC",
      totalCompletedLessons: 1,
      today: new Date("2026-10-12T12:00:00.000Z"),
    });

    expect(summary.practiceDays).toEqual(["2026-10-10", "2026-10-11"]);
    expect(summary.practiceDaysLast7).toBe(2);
    expect(summary.totalCompletedLessons).toBe(1);
  });

  it("excludes empty conversations by requiring a conversation activity", () => {
    const summary = buildProgressSummary({
      activities: [],
      timezone: "UTC",
      totalCompletedLessons: 0,
      today: new Date("2026-10-12T12:00:00.000Z"),
    });

    expect(summary.practiceDaysLast14).toBe(0);
  });

  it("handles current streak when today is empty but yesterday was practiced", () => {
    expect(
      calculateCurrentStreak(
        ["2026-10-10", "2026-10-11"],
        new Date("2026-10-12T12:00:00.000Z"),
        "UTC",
      ),
    ).toBe(2);
  });

  it("uses timezone boundaries for conversation practice days", () => {
    expect(
      uniquePracticeDays(
        [{ type: "conversation", occurredAt: "2026-10-11T21:00:00.000Z" }],
        "Asia/Tehran",
      ),
    ).toEqual(["2026-10-12"]);
  });
});
