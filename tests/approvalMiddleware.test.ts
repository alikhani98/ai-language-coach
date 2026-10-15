import { beforeEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => vi.resetModules());
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  eq: vi.fn(),
  setCookies: undefined as
    | undefined
    | ((cookies: { name: string; value: string; options: object }[]) => void),
}));
vi.mock("@/lib/env", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.test",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test",
  },
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: unknown,
    _key: unknown,
    options: { cookies: { setAll: typeof mocks.setCookies } },
  ) => {
    mocks.setCookies = options.cookies.setAll;
    return {
      auth: { getUser: mocks.getUser },
      from: () => ({ select: () => ({ eq: mocks.eq }) }),
    };
  },
}));
import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
const profile = {
  level: "a2_elementary",
  goal: "work",
  daily_minutes: 15,
  timezone: "UTC",
  status: "active",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "owner", app_metadata: {} } },
  });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: profile, error: null });
});
const request = (path: string) =>
  new NextRequest(`https://example.test${path}`);
describe("middleware account routing", () => {
  it.each([
    ["pending", "/approval-pending"],
    ["suspended", "/account-suspended"],
    ["rejected", "/account-rejected"],
  ])("redirects %s without loops", async (status, path) => {
    mocks.maybeSingle.mockResolvedValue({
      data: { ...profile, status },
      error: null,
    });
    expect(
      (await updateSession(request("/practice"))).headers.get("location"),
    ).toBe(`https://example.test${path}`);
    expect(
      (await updateSession(request(path))).headers.get("location"),
    ).toBeNull();
  });
  it("keeps active learning access", async () =>
    expect(
      (await updateSession(request("/practice"))).headers.get("location"),
    ).toBeNull());
  it("sends an approved incomplete profile to onboarding", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { ...profile, level: "" },
      error: null,
    });
    expect(
      (await updateSession(request("/dashboard"))).headers.get("location"),
    ).toBe("https://example.test/onboarding");
  });
  it("denies normal users admin routes", async () =>
    expect(
      (await updateSession(request("/admin/users"))).headers.get("location"),
    ).toBe("https://example.test/dashboard"));
  it("allows active admins through to the server authorization boundary", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "owner", app_metadata: { role: "admin" } } },
    });
    expect(
      (await updateSession(request("/admin"))).headers.get("location"),
    ).toBeNull();
  });
  it("requires authentication for both status and admin pages", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    for (const path of ["/approval-pending", "/admin", "/onboarding"])
      expect((await updateSession(request(path))).headers.get("location")).toBe(
        "https://example.test/login",
      );
  });
  it("retains refreshed session cookies on redirects", async () => {
    mocks.getUser.mockImplementation(async () => {
      mocks.setCookies?.([
        { name: "session", value: "refreshed", options: { httpOnly: true } },
      ]);
      return { data: { user: null } };
    });
    expect(
      (await updateSession(request("/admin"))).cookies.get("session")?.value,
    ).toBe("refreshed");
  });
  it("fails closed on profile query failure", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "internal" },
    });
    expect(
      (await updateSession(request("/practice"))).headers.get("location"),
    ).toBe("https://example.test/approval-pending");
  });
});
