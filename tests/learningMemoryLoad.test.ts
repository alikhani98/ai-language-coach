import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/lib/actions/profile";

// The suite uses --isolate=false; reload server modules before installing this file's client mock.
vi.hoisted(() => vi.resetModules());

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getUser: vi.fn(), from: vi.fn(), rpc: vi.fn(), execute: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
import { loadLearningMemory, refreshLearningMemory } from "@/lib/memory/load";

const profile = { user_id: "owner", timezone: "Asia/Tehran" } as UserProfile;
const zero = { lessons: 0, vocabulary: 0, conversations: 0, exchanges: 0 };
const data = { totals: zero, current: { ...zero, days: 0 }, previous: { ...zero, days: 0 }, areas: {}, topics: {} };
let query: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; abortSignal: ReturnType<typeof vi.fn>; maybeSingle: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser }, from: mocks.from, rpc: mocks.rpc });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), abortSignal: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
  mocks.from.mockReturnValue(query);
  mocks.rpc.mockReturnValue({ abortSignal: mocks.execute });
  mocks.execute.mockResolvedValue({ data, error: null });
});

describe("memory owner boundaries and recovery", () => {
  it("never queries memory when the profile does not match the authenticated user", async () => {
    expect(await loadLearningMemory({ ...profile, user_id: "someone-else" })).toEqual({ status: "unavailable" });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("uses an explicit owner filter and invokes refresh without any user-controlled arguments", async () => {
    expect((await loadLearningMemory(profile)).status).toBe("ready");
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(mocks.rpc).toHaveBeenCalledWith("refresh_learning_memory");
  });

  it("forces event-driven rebuilds and handles repeated events without local increments", async () => {
    const first = await refreshLearningMemory(profile);
    expect(await refreshLearningMemory(profile)).toEqual(first);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it("reuses only a valid snapshot from today within the five-minute freshness budget", async () => {
    const { getLocalDateKey } = await import("@/lib/daily/date");
    query.maybeSingle.mockResolvedValue({ data: { user_id: "owner", schema_version: 1, as_of: getLocalDateKey(new Date(), profile.timezone), snapshot: data, updated_at: new Date().toISOString() }, error: null });
    expect((await loadLearningMemory(profile)).status).toBe("ready");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each(["old-day", "old-cache", "invalid", "wrong-owner"])("rebuilds a %s snapshot", async (mode) => {
    const { getLocalDateKey } = await import("@/lib/daily/date");
    query.maybeSingle.mockResolvedValue({ data: {
      user_id: mode === "wrong-owner" ? "other" : "owner", schema_version: 1,
      as_of: mode === "old-day" ? "2000-01-01" : getLocalDateKey(new Date(), profile.timezone),
      snapshot: mode === "invalid" ? { email: "private" } : data,
      updated_at: mode === "old-cache" ? "2000-01-01" : new Date().toISOString(),
    }, error: null });
    expect((await loadLearningMemory(profile)).status).toBe("ready");
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });

  it.each(["missing-migration", "invalid-data", "network"])("keeps memory optional on %s", async (mode) => {
    if (mode === "network") mocks.execute.mockRejectedValue(new Error("offline"));
    else mocks.execute.mockResolvedValue({ data: mode === "invalid-data" ? { private: "text" } : null, error: mode === "missing-migration" ? { code: "42883" } : null });
    expect(await refreshLearningMemory(profile)).toEqual({ status: "unavailable" });
  });

  it("does not use a cached snapshot after authentication expires", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await loadLearningMemory(profile)).toEqual({ status: "unavailable" });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
