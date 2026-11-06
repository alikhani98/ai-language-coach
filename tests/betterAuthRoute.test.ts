import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getBetterAuth: vi.fn(),
  handler: vi.fn(),
}));

vi.mock("@/lib/auth/better-auth", () => ({
  getBetterAuth: mocks.getBetterAuth,
}));

import { GET, POST } from "../app/api/auth/[...all]/route";

const url = "http://localhost:3000/api/auth/get-session";

describe("development-only Better Auth API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ZABAN_BETTER_AUTH_DEV_ROUTE", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 by default without initializing auth", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const response = await GET(new Request(url));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.getBetterAuth).not.toHaveBeenCalled();
  });

  it("cannot be enabled in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ZABAN_BETTER_AUTH_DEV_ROUTE", "enabled");

    for (const method of ["GET", "POST"]) {
      const request = new Request(url, { method });
      const response = method === "GET"
        ? await GET(request)
        : await POST(request);

      expect(response.status).toBe(404);
    }

    expect(mocks.getBetterAuth).not.toHaveBeenCalled();
  });

  it("forwards GET only when explicitly enabled in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ZABAN_BETTER_AUTH_DEV_ROUTE", "enabled");

    mocks.getBetterAuth.mockReturnValue({
      handler: mocks.handler,
    });

    mocks.handler.mockResolvedValue(
      new Response("test-session", { status: 200 }),
    );

    const request = new Request(url);
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("test-session");
    expect(mocks.getBetterAuth).toHaveBeenCalledTimes(1);
    expect(mocks.handler).toHaveBeenCalledWith(request);
  });

  it("forwards POST without modifying the request", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ZABAN_BETTER_AUTH_DEV_ROUTE", "enabled");

    mocks.getBetterAuth.mockReturnValue({
      handler: mocks.handler,
    });

    mocks.handler.mockResolvedValue(
      new Response("accepted", { status: 200 }),
    );

    const request = new Request(
      "http://localhost:3000/api/auth/sign-in/email",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "test-only-password",
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.handler).toHaveBeenCalledWith(request);
    expect(mocks.getBetterAuth).toHaveBeenCalledTimes(1);
  });
});