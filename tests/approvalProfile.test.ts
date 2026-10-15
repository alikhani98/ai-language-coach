import { beforeEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => vi.resetModules());
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  maybeSingle: vi.fn(),
  eq: vi.fn(),
}));
vi.unmock("@/lib/actions/profile");
vi.mock("@/lib/auth/user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: mocks.eq }) }),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { requireProfile } from "@/lib/actions/profile";
const profile = {
  user_id: "owner",
  level: "a2_elementary",
  goal: "work",
  daily_minutes: 15,
  timezone: "UTC",
  interface_language: "en",
  theme_preference: "system",
  status: "active",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "owner" });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: profile, error: null });
});
describe("learning server action boundary", () => {
  it.each([
    ["pending", "/approval-pending"],
    ["suspended", "/account-suspended"],
    ["rejected", "/account-rejected"],
  ])("blocks %s even without middleware", async (status, path) => {
    mocks.maybeSingle.mockResolvedValue({
      data: { ...profile, status },
      error: null,
    });
    await expect(requireProfile()).rejects.toThrow(`redirect:${path}`);
  });
  it("allows active complete users and scopes profile to session owner", async () => {
    expect(await requireProfile()).toEqual(profile);
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "owner");
  });
  it("fails closed on missing profile and missing status", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(requireProfile()).rejects.toThrow(
      "redirect:/approval-pending",
    );
    mocks.maybeSingle.mockResolvedValue({
      data: { ...profile, status: undefined },
      error: null,
    });
    await expect(requireProfile()).rejects.toThrow(
      "redirect:/approval-pending",
    );
  });
});
