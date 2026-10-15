import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/lib/actions/profile";

// Keep this file's session client mock independent in the non-isolated worker.
vi.hoisted(() => vi.resetModules());

const { from, createClient } = vi.hoisted(() => ({ from: vi.fn(), createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
import { loadLearnerContext } from "@/lib/learner/load";

const profile = {
  user_id: "authenticated-user", level: "a2_elementary", goal: "conversation", daily_minutes: 15,
  interface_language: "fa", timezone: "Asia/Tehran", theme_preference: "system", id: "profile-id", created_at: "2026-10-14",
} as UserProfile;

beforeEach(() => { from.mockReset(); createClient.mockReset(); createClient.mockResolvedValue({ from }); });

describe("learner history loading", () => {
  it("scopes every bounded query to the authenticated profile and excludes dismissed mistakes", async () => {
    const queries: { eq: ReturnType<typeof vi.fn>; is: ReturnType<typeof vi.fn>; limit: ReturnType<typeof vi.fn> }[] = [];
    from.mockImplementation(() => {
      const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
      queries.push(query); return query;
    });
    const context = await loadLearnerContext(profile);
    expect(from.mock.calls.map(([table]) => table)).toEqual(["mistakes", "daily_lessons", "conversations"]);
    for (const query of queries) expect(query.eq).toHaveBeenCalledWith("user_id", "authenticated-user");
    expect(queries[0].is).toHaveBeenCalledWith("dismissed_at", null);
    expect(queries.map((query) => query.limit.mock.calls[0][0])).toEqual([8, 5, 4]);
    expect(context.preferredExplanationStyle).toContain("Persian");
  });

  it("retains available history when another optional query fails", async () => {
    from.mockImplementation((table) => ({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(table === "mistakes"
        ? { data: [{ wrong_sentence: "I go yesterday", correct_sentence: "I went yesterday", explanation: "Past tense", category: "grammar" }], error: null }
        : { data: null, error: { message: "offline" } }),
    }));
    expect((await loadLearnerContext(profile)).weakAreas).toEqual(["past_simple"]);
  });

  it("degrades to the existing profile if optional history transport fails", async () => {
    createClient.mockRejectedValueOnce(new Error("offline"));
    const context = await loadLearnerContext(profile);
    expect(context.level).toBe(profile.level);
    expect(context.recentMistakes).toEqual([]);
  });
});
