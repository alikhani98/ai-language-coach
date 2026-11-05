import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  betterAuth: vi.fn(),
  drizzleAdapter: vi.fn(),
  getMySqlDatabase: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("better-auth", () => ({
  betterAuth: mocks.betterAuth,
}));

vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: mocks.drizzleAdapter,
}));

vi.mock("@/lib/db/client", () => ({
  getMySqlDatabase: mocks.getMySqlDatabase,
}));

describe("Better Auth lazy initialization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not initialize authentication or connect to MySQL on import", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");

    const { getBetterAuth } = await import("@/lib/auth/better-auth");

    expect(typeof getBetterAuth).toBe("function");
    expect(mocks.getMySqlDatabase).not.toHaveBeenCalled();
    expect(mocks.drizzleAdapter).not.toHaveBeenCalled();
    expect(mocks.betterAuth).not.toHaveBeenCalled();
  });

  it("rejects a missing secret before accessing MySQL", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");

    const { getBetterAuth } = await import("@/lib/auth/better-auth");

    expect(() => getBetterAuth()).toThrow("32 bytes");
    expect(mocks.getMySqlDatabase).not.toHaveBeenCalled();
  });

  it("rejects a weak secret before accessing MySQL", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "short");

    const { getBetterAuth } = await import("@/lib/auth/better-auth");

    expect(() => getBetterAuth()).toThrow("32 bytes");
    expect(mocks.getMySqlDatabase).not.toHaveBeenCalled();
  });

  it("configures secure authentication and reuses one instance", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(48));
    vi.stubEnv("APP_URL", "https://zaban.54i.ir");

    const database = { testDatabase: true };
    const adapter = { testAdapter: true };
    const authInstance = { testAuth: true };

    mocks.getMySqlDatabase.mockReturnValue(database);
    mocks.drizzleAdapter.mockReturnValue(adapter);
    mocks.betterAuth.mockReturnValue(authInstance);

    const { getBetterAuth } = await import("@/lib/auth/better-auth");

    expect(getBetterAuth()).toBe(authInstance);
    expect(getBetterAuth()).toBe(authInstance);

    expect(mocks.getMySqlDatabase).toHaveBeenCalledTimes(1);
    expect(mocks.drizzleAdapter).toHaveBeenCalledWith(
      database,
      expect.objectContaining({ provider: "mysql" }),
    );

    expect(mocks.betterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://zaban.54i.ir",
        secret: "x".repeat(48),
        database: adapter,
        emailAndPassword: expect.objectContaining({
          enabled: true,
          disableSignUp: true,
          requireEmailVerification: false,
        }),
        telemetry: expect.objectContaining({
          enabled: false,
        }),
      }),
    );

    expect(mocks.betterAuth).toHaveBeenCalledTimes(1);
  });
});