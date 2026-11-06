import { describe, it, expect } from "vitest";
import { computeMySqlMemorySnapshot } from "@/lib/memory/mysql-snapshot";
import { isMySqlPreviewEnabled } from "@/lib/auth/backend-mode";

describe("MySQL completion: numeric learning memory and production opt-in", () => {
  it("defaults to Supabase without explicit double opt-in", () => {
    expect(isMySqlPreviewEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isMySqlPreviewEnabled({ NODE_ENV: "production", ZABAN_DATA_BACKEND: "mysql" })).toBe(false);
    expect(isMySqlPreviewEnabled({ NODE_ENV: "test", ZABAN_DATA_BACKEND: "mysql", ZABAN_CUTOVER_APPROVED: "yes" })).toBe(false);
  });
  it("permits production only when explicitly approved", () => {
    expect(isMySqlPreviewEnabled({ NODE_ENV: "production", ZABAN_DATA_BACKEND: "mysql", ZABAN_CUTOVER_APPROVED: "yes" })).toBe(true);
    expect(isMySqlPreviewEnabled({ NODE_ENV: "development", ZABAN_MYSQL_PREVIEW: "enabled", ZABAN_BETTER_AUTH_DEV_ROUTE: "enabled" })).toBe(true);
  });
  it("counts only answered exchanges and deduplicates session evidence", () => {
    const snapshot = computeMySqlMemorySnapshot("2026-11-06", {
      lessons: [{ day: "2026-11-06", words: 4 }],
      answers: [{ id: "a1", conversationId: "c1", topic: "work", day: "2026-11-05", corrections: [
        { category: "grammar", original: "I go yesterday", corrected: "I went yesterday", explanation: "Past simple" },
      ] }, { id: "a2", conversationId: "c1", topic: "work", day: "2026-11-06", corrections: [] }],
      ended: [{ conversationId: "c1", day: "2026-11-06" }, { conversationId: "unanswered", day: "2026-11-06" }],
      dismissed: new Set(), manual: [],
    });
    expect(snapshot.totals).toEqual({ lessons: 1, vocabulary: 4, conversations: 1, exchanges: 2 });
    expect(snapshot.current.days).toBe(2);
    expect(snapshot.topics.work).toEqual({ exchanges: 2, sessions: 1 });
    expect(snapshot.areas.past_simple).toMatchObject({ total: 1, sessions: 1, recent: 1, recent_feedback: 1 });
  });
  it("excludes dismissed corrections and counts manual evidence once", () => {
    const snap = computeMySqlMemorySnapshot("2026-11-06", {
      lessons: [], answers: [{ id: "a", conversationId: "c", topic: "travel", day: "2026-11-06", corrections: [
        { category: "grammar", original: "bad", corrected: "good", explanation: "rule" },
      ] }], ended: [], dismissed: new Set(["a:0"]),
      manual: [{ day: "2026-11-05", category: "vocabulary", original: "x", corrected: "y", explanation: "z" }],
    });
    expect(snap.areas.grammar).toBeUndefined();
    expect(snap.areas.vocabulary?.total).toBe(1);
    expect(snap.areas.vocabulary?.recent_feedback).toBe(0);
  });
});
