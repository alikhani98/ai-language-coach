import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => vi.resetModules());
const mock = vi.hoisted(() => ({
  createClient: vi.fn(),
  getBetterAuth: vi.fn(),
  getSession: vi.fn(),
  resolveActiveAppIdentity: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mock.createClient }));
vi.mock("@/lib/auth/better-auth", () => ({ getBetterAuth: mock.getBetterAuth }));
vi.mock("@/lib/auth/identity", () => ({ resolveActiveAppIdentity: mock.resolveActiveAppIdentity }));
vi.mock("next/headers", () => ({ headers: mock.headers }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
}));

import { isMySqlPreviewEnabled } from "@/lib/auth/backend-mode";
import { getCurrentUser, requireUser } from "@/lib/auth/user";

const authUserId = "90000000-0000-4000-8000-000000000001";
const appUserId = "90000000-0000-4000-8000-000000000002";
const preview = {
  NODE_ENV: "development",
  ZABAN_MYSQL_PREVIEW: "enabled",
  ZABAN_BETTER_AUTH_DEV_ROUTE: "enabled",
};

beforeEach(() => {
  vi.clearAllMocks();
  mock.getBetterAuth.mockReturnValue({ api: { getSession: mock.getSession } });
  mock.headers.mockResolvedValue(new Headers({ cookie: "session=test" }));
  mock.getSession.mockResolvedValue({
    user: { id: authUserId, email: "admin@example.test" },
    session: { userId: authUserId },
  });
  mock.resolveActiveAppIdentity.mockResolvedValue({ appUserId, role: "admin" });
});
afterEach(() => vi.unstubAllEnvs());

describe("development-only MySQL backend selection", () => {
  it("requires both opt-in flags and the development runtime", () => {
    expect(isMySqlPreviewEnabled(preview)).toBe(true);
    expect(isMySqlPreviewEnabled({ ...preview, NODE_ENV: "production" })).toBe(false);
    expect(isMySqlPreviewEnabled({ ...preview, NODE_ENV: "test" })).toBe(false);
  });
  it("does not activate when either flag is missing or mistyped", () => {
    expect(isMySqlPreviewEnabled({ ...preview, ZABAN_MYSQL_PREVIEW: undefined })).toBe(false);
    expect(isMySqlPreviewEnabled({ ...preview, ZABAN_BETTER_AUTH_DEV_ROUTE: undefined })).toBe(false);
    expect(isMySqlPreviewEnabled({ ...preview, ZABAN_MYSQL_PREVIEW: "true" })).toBe(false);
  });
  it("does not activate by default without any flags", () => {
    expect(isMySqlPreviewEnabled({ NODE_ENV: "development" })).toBe(false);
  });
  it("retains the original Supabase user path when disabled", async () => {
    vi.stubEnv("ZABAN_MYSQL_PREVIEW", "disabled");
    mock.createClient.mockResolvedValue({ auth: { getUser: async () => ({
      data: { user: { id: "supabase-user", app_metadata: {} } }, error: null,
    }) } });
    expect((await getCurrentUser())?.id).toBe("supabase-user");
    expect(mock.createClient).toHaveBeenCalledOnce();
    expect(mock.getBetterAuth).not.toHaveBeenCalled();
  });
});

describe("preview Better Auth session ownership", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ZABAN_MYSQL_PREVIEW", "enabled");
    vi.stubEnv("ZABAN_BETTER_AUTH_DEV_ROUTE", "enabled");
  });
  it("maps a signed auth session to the database application identity", async () => {
    const user = await getCurrentUser();
    expect(user).toMatchObject({ id: appUserId, app_metadata: { role: "admin" } });
    expect(mock.getSession).toHaveBeenCalledWith({
      headers: expect.any(Headers), query: { disableCookieCache: true },
    });
    expect(mock.resolveActiveAppIdentity).toHaveBeenCalledWith(authUserId);
    expect(mock.createClient).not.toHaveBeenCalled();
  });
  it("rejects a missing session before requesting an application identity", async () => {
    mock.getSession.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
    expect(mock.resolveActiveAppIdentity).not.toHaveBeenCalled();
    expect(mock.createClient).not.toHaveBeenCalled();
  });
  it("rejects a mismatch between session owner and authenticated user", async () => {
    mock.getSession.mockResolvedValue({
      user: { id: authUserId, email: "admin@example.test" },
      session: { userId: "forged" },
    });
    expect(await getCurrentUser()).toBeNull();
    expect(mock.resolveActiveAppIdentity).not.toHaveBeenCalled();
  });
  it("rejects a revoked, inactive, or missing application identity", async () => {
    mock.resolveActiveAppIdentity.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
    expect(mock.createClient).not.toHaveBeenCalled();
  });
  it("requires an active identity for protected server actions", async () => {
    mock.resolveActiveAppIdentity.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("redirect:/login");
    expect(mock.createClient).not.toHaveBeenCalled();
  });
});
