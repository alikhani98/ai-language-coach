import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({
  getMySqlDatabase: vi.fn(() => { throw new Error("Do not open MySQL during offline tests."); }),
}));

import { buildMySqlProfileUpdate, updateMySqlProfile } from "@/lib/mysql/profile-write";
import {
  assertMySqlLessonKey,
  isMySqlDuplicateKey,
  mapMySqlLesson,
  getMySqlDailyLesson,
  publishMySqlDailyLesson,
} from "@/lib/mysql/daily-lesson";
import { loadMySqlLearnerContext } from "@/lib/mysql/learner-context";
import type { UserProfile } from "@/lib/actions/profile";

const userId = "90000000-0000-4000-8000-000000000001";
const lessonId = "90000000-0000-4000-8000-000000000002";

const profile = {
  id: lessonId,
  user_id: userId,
  level: "a2_elementary",
  goal: "conversation",
  daily_minutes: 15,
  timezone: "UTC",
  interface_language: "fa",
  theme_preference: "system",
  status: "active",
  created_at: "2026-11-06T12:00:00.000Z",
} as UserProfile;

const rawLesson = {
  id: lessonId,
  userId,
  date: "2026-11-06",
  words: [
    { word: "improve", meaning: "بهبود دادن", example: "I improve my skills." },
    { word: "practice", meaning: "تمرین", example: "I practice every day." },
    { word: "achieve", meaning: "دستیابی", example: "I achieve my goals." },
  ],
  sentence: "I practice English every day.",
  readingText: "A".repeat(90),
  speakingTask: "Describe your learning goals today.",
  completed: 1,
  generationStatus: "ready" as const,
  createdAt: "2026-11-06 12:10:00.123",
};

describe("MySQL learner application adapters (isolated / no database writes)", () => {
  it("allowlists profile preferences and drops forged roles, status and owner", () => {
    const changes = buildMySqlProfileUpdate({
      level: "a2_elementary",
      goal: "conversation",
      daily_minutes: "15",
      timezone: "Asia/Tehran",
      interface_language: "fa",
      theme_preference: "dark",
      user_id: "forged",
      status: "active",
      role: "admin",
      approved_by: "forged",
    });
    expect(changes).toEqual({
      level: "a2_elementary",
      goal: "conversation",
      dailyMinutes: 15,
      timezone: "Asia/Tehran",
      interfaceLanguage: "fa",
      themePreference: "dark",
    });
    expect(Object.keys(changes)).toHaveLength(6);
  });

  it("rejects invalid profile settings before a database connection", () => {
    expect(() => buildMySqlProfileUpdate({
      level: "not-a-level", goal: "conversation", daily_minutes: 15,
      timezone: "UTC", interface_language: "fa", theme_preference: "system",
    })).toThrow();
  });

  it("denies a malformed application identity before profile mutation", async () => {
    await expect(updateMySqlProfile("forged-user", {})).rejects.toThrow(
      "Invalid application identity.",
    );
  });

  it("accepts valid UTC date keys and rejects invalid calendar days", () => {
    expect(() => assertMySqlLessonKey(userId, "2026-11-06")).not.toThrow();
    expect(() => assertMySqlLessonKey(userId, "2026-02-30")).toThrow();
    expect(() => assertMySqlLessonKey(userId, "2026-11-06 OR 1=1")).toThrow();
  });

  it("rejects invalid lesson identity before accessing the database", async () => {
    await expect(getMySqlDailyLesson("bad", "2026-11-06")).rejects.toThrow();
    await expect(publishMySqlDailyLesson(userId, "bad", {})).rejects.toThrow();
  });

  it("recognizes MySQL duplicate key errors without swallowing unrelated failures", () => {
    expect(isMySqlDuplicateKey({ code: "ER_DUP_ENTRY", errno: 1062 })).toBe(true);
    expect(isMySqlDuplicateKey({ errno: 1062 })).toBe(true);
    expect(isMySqlDuplicateKey({ code: "ER_LOCK_WAIT_TIMEOUT", errno: 1205 })).toBe(false);
    expect(isMySqlDuplicateKey(null)).toBe(false);
  });

  it("preserves the existing daily lesson UI format and UTC time", () => {
    const result = mapMySqlLesson(rawLesson);
    expect(result.id).toBe(lessonId);
    expect(result.user_id).toBe(userId);
    expect(result.words).toHaveLength(3);
    expect(result.completed).toBe(true);
    expect(result.created_at).toBe("2026-11-06T12:10:00.123Z");
    expect(result.generation_status).toBe("ready");
  });

  it("maps numeric false completion without treating it as truthy", () => {
    expect(mapMySqlLesson({ ...rawLesson, completed: 0 }).completed).toBe(false);
  });

  it("rejects corrupt MySQL vocabulary data", () => {
    expect(() => mapMySqlLesson({ ...rawLesson, words: "corrupt" })).toThrow();
  });

  it("refuses invalid IDs for history queries", async () => {
    await expect(loadMySqlLearnerContext({ ...profile, user_id: "invalid" }))
      .rejects.toThrow("Invalid application identity.");
  });

  it("degrades optional history safely if the database is unavailable", async () => {
    const result = await loadMySqlLearnerContext(profile);
    expect(result.level).toBe(profile.level);
    expect(result.goal).toBe(profile.goal);
    expect(result.recentMistakes).toEqual([]);
    expect(result.recentLessons).toEqual([]);
  });
});
