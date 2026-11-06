import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({
  getMySqlDatabase: vi.fn(() => {
    throw new Error("Database must not be initialized during pure mapping tests.");
  }),
}));

import {
  formatMySqlUtcDateTime,
  mapMySqlProfile,
} from "@/lib/mysql/profile";
import {
  buildMySqlProgressData,
  mysqlTimestampToIso,
} from "@/lib/mysql/progress";

const validProfile = {
  id: "90000000-0000-4000-8000-000000000002",
  userId: "90000000-0000-4000-8000-000000000001",
  level: "a2_elementary",
  goal: "conversation",
  dailyMinutes: 15,
  timezone: "UTC",
  interfaceLanguage: "fa" as const,
  themePreference: "system" as const,
  createdAt: "2026-11-06 12:00:01.120",
  status: "active" as const,
};

describe("read-only MySQL adapters (no database connections)", () => {
  it("preserves the existing user profile shape", () => {
    expect(mapMySqlProfile(validProfile)).toEqual({
      id: validProfile.id,
      user_id: validProfile.userId,
      level: "a2_elementary",
      goal: "conversation",
      daily_minutes: 15,
      timezone: "UTC",
      interface_language: "fa",
      theme_preference: "system",
      created_at: "2026-11-06T12:00:01.120Z",
      status: "active",
    });
  });

  it("rejects invalid profile fields rather than returning corrupt data", () => {
    expect(() => mapMySqlProfile({ ...validProfile, dailyMinutes: 0 })).toThrow();
    expect(() => mapMySqlProfile({ ...validProfile, timezone: "not-a-zone" })).toThrow();
  });

  it("interprets MySQL DATETIME as UTC and never as host local time", () => {
    expect(formatMySqlUtcDateTime("2026-11-06 12:00:01")).toBe(
      "2026-11-06T12:00:01.000Z",
    );
    expect(mysqlTimestampToIso("2026-11-06 21:00:00.2")).toBe(
      "2026-11-06T21:00:00.200Z",
    );
    expect(() => mysqlTimestampToIso("garbage")).toThrow();
  });

  it("counts completed lessons and matched conversation exchanges only", () => {
    const summary = buildMySqlProgressData({
      lessons: [{ id: "L1", date: "2026-11-06" }],
      conversations: [{ id: "C1", topic: "travel" }],
      messages: [
        { id: "M1", conversationId: "C1", role: "user", requestId: "R1", createdAt: "2026-11-06 08:00:00" },
        { id: "M2", conversationId: "C1", role: "assistant", requestId: "R1", createdAt: "2026-11-06 08:01:00" },
        { id: "M3", conversationId: "C1", role: "assistant", requestId: "R2", createdAt: "2026-11-06 08:02:00" },
      ],
      mistakes: [{ category: "grammar" }, { category: "grammar" }],
    }, "UTC", new Date("2026-11-06T16:00:00Z"));
    expect(summary.summary.totalCompletedLessons).toBe(1);
    expect(summary.summary.practiceDays).toEqual(["2026-11-06"]);
    expect(summary.topicCounts).toEqual([{ topic: "travel", count: 1 }]);
    expect(summary.recentActivity).toHaveLength(2);
    expect(summary.weakAreas).toEqual([{ category: "grammar", count: 2 }]);
  });

  it("applies the learner timezone when grouping conversation activity", () => {
    const summary = buildMySqlProgressData({
      lessons: [],
      conversations: [{ id: "C1", topic: "work" }],
      messages: [
        { id: "M1", conversationId: "C1", role: "user", requestId: "R1", createdAt: "2026-11-06 21:00:00" },
        { id: "M2", conversationId: "C1", role: "assistant", requestId: "R1", createdAt: "2026-11-06 21:01:00" },
      ],
      mistakes: [],
    }, "Asia/Tehran", new Date("2026-11-07T12:00:00Z"));
    expect(summary.summary.practiceDays).toEqual(["2026-11-07"]);
    expect(summary.recentActivity[0].occurred_at).toBe("2026-11-07");
  });
});
