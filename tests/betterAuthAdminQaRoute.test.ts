import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveBetterAuthAdmin: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  resolveBetterAuthAdmin: mocks.resolveBetterAuthAdmin,
}));

import { GET } from "../app/api/qa/admin-session/route";

const url = "http://localhost:3000/api/qa/admin-session";

function request(): Request {
  return new Request(url, {
    headers: {
      cookie: "better-auth.session_token=test-placeholder",
    },
  });
}

function enableQa() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("ZABAN_BETTER_AUTH_DEV_ROUTE", "enabled");
  vi.stubEnv("ZABAN_BETTER_AUTH_ADMIN_QA", "enabled");
}

describe("development-only administrator authorization endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ZABAN_BETTER_AUTH_DEV_ROUTE", "");
    vi.stubEnv("ZABAN_BETTER_AUTH_ADMIN_QA", "");
    mocks.resolveBetterAuthAdmin.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 by default without checking a session", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.resolveBetterAuthAdmin).not.toHaveBeenCalled();
  });

  it.each([
    "ZABAN_BETTER_AUTH_DEV_ROUTE",
    "ZABAN_BETTER_AUTH_ADMIN_QA",
  ])("requires the %s flag", async (missingFlag) => {
    enableQa();
    vi.stubEnv(missingFlag, "");

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(mocks.resolveBetterAuthAdmin).not.toHaveBeenCalled();
  });

  it.each(["production", "test"])(
    "cannot be enabled in %s",
    async (environment) => {
      enableQa();
      vi.stubEnv("NODE_ENV", environment);

      const response = await GET(request());

      expect(response.status).toBe(404);
      expect(mocks.resolveBetterAuthAdmin).not.toHaveBeenCalled();
    },
  );

  it("allows a verified active administrator", async () => {
    enableQa();

    mocks.resolveBetterAuthAdmin.mockResolvedValue({
      betterAuthUserId: "123e4567-e89b-42d3-a456-426614174000",
      appUserId: "b7244d37-2aa4-4b84-bc35-f616cb1ea4a6",
      role: "admin",
    });

    const req = request();
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authorized: true,
    });

    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(response.headers.get("set-cookie")).toBeNull();

    expect(mocks.resolveBetterAuthAdmin)
      .toHaveBeenCalledExactlyOnceWith(req.headers);
  });

  it("denies requests without administrator authorization", async () => {
    enableQa();

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.resolveBetterAuthAdmin).toHaveBeenCalledTimes(1);
  });

  it("fails closed without leaking internal errors", async () => {
    enableQa();

    mocks.resolveBetterAuthAdmin.mockRejectedValue(
      new Error("Sensitive database connection details"),
    );

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});