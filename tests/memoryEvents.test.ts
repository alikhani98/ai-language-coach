import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => vi.resetModules());

const mocks = vi.hoisted(() => ({ requireProfile: vi.fn(), createClient: vi.fn(), from: vi.fn(), refresh: vi.fn(), summary: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/actions/profile", () => ({ requireProfile: mocks.requireProfile }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/ai/progressCoach", () => ({ generateProgressSummary: mocks.summary }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { finishTodaysLesson } from "@/lib/actions/dailyLesson";
import { removeMistake, syncConversationCorrections } from "@/lib/actions/mistakes";
import * as memoryLoader from "@/lib/memory/load";

const profile = { user_id: "owner", interface_language: "en", timezone: "UTC" };
const lesson = { id: "lesson", user_id: "owner", date: "2026-10-14", words: [], sentence: "A sentence.", reading_text: "A text.", speaking_task: "A task.", completed: false, generation_status: "ready", created_at: "2026-10-14" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireProfile.mockResolvedValue(profile);
  mocks.createClient.mockResolvedValue({ from: mocks.from });
  mocks.refresh.mockResolvedValue({ status: "unavailable" });
  vi.spyOn(memoryLoader, "refreshLearningMemory").mockImplementation(mocks.refresh);
  mocks.summary.mockResolvedValue({ vocabulary: "Reviewed", grammar: "Practiced", speaking: "Not assessed", tomorrow: "Practice" });
});
afterEach(() => vi.restoreAllMocks());

describe("learning event memory hooks", () => {
  it("refreshes after a successful lesson commit without failing completion when memory is unavailable", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: lesson, error: null }),
      update: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { ...lesson, completed: true }, error: null }) };
    mocks.from.mockReturnValue(query);
    const result = await finishTodaysLesson();
    expect(result.lesson?.completed).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mocks.refresh).toHaveBeenCalledWith(profile);
    expect(query.single.mock.invocationCallOrder[0]).toBeLessThan(mocks.refresh.mock.invocationCallOrder[0]);
  });

  it("heals memory on an idempotent lesson retry without updating lesson counts locally", async () => {
    const update = vi.fn();
    mocks.from.mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update,
      maybeSingle: vi.fn().mockResolvedValue({ data: { ...lesson, completed: true }, error: null }) });
    expect((await finishTodaysLesson()).lesson?.completed).toBe(true);
    expect(update).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("does not refresh memory for a failed lesson write", async () => {
    mocks.from.mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: lesson, error: null }), single: vi.fn().mockResolvedValue({ data: null, error: { message: "write failed" } }) });
    expect((await finishTodaysLesson()).error).toBe("write failed");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("rebuilds after dismissing a notebook entry and scopes the mutation to its owner", async () => {
    const query = { update: vi.fn().mockReturnThis(), eq: vi.fn() };
    query.eq.mockReturnValueOnce(query).mockResolvedValueOnce({ error: null });
    mocks.from.mockReturnValue(query);
    const form = new FormData(); form.set("mistakeId", "11111111-1111-4111-8111-111111111111");
    expect((await removeMistake({}, form)).success).toBeTruthy();
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(mocks.refresh).toHaveBeenCalledWith(profile);
  });

  it("rebuilds from existing corrections even when notebook sync has no new rows", async () => {
    mocks.from.mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) });
    expect(await syncConversationCorrections()).toEqual({ inserted: 0 });
    expect(mocks.refresh).toHaveBeenCalledWith(profile);
  });
});
