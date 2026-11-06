import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getBetterAuth: vi.fn(),
  getSession: vi.fn(),
  resolveActiveAppIdentity: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/better-auth", () => ({
  getBetterAuth: mocks.getBetterAuth,
}));

vi.mock("@/lib/auth/identity", () => ({
  resolveActiveAppIdentity: mocks.resolveActiveAppIdentity,
}));

import {
  resolveActiveBetterAuthSession,
  resolveBetterAuthAdmin,
} from "@/lib/auth/session";

const authUserId = "123e4567-e89b-42d3-a456-426614174000";
const appUserId = "b7244d37-2aa4-4b84-bc35-f616cb1ea4a6";

const requestHeaders = new Headers({
  cookie: "better-auth.session_token=test-placeholder",
});

function validSession() {
  return {
    user: { id: authUserId },
    session: { userId: authUserId },
  };
}

describe("Better Auth server-side administrator authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getBetterAuth.mockReturnValue({
      api: { getSession: mocks.getSession },
    });

    mocks.getSession.mockResolvedValue(null);
    mocks.resolveActiveAppIdentity.mockResolvedValue(null);
  });

  it("denies requests without a verified session", async () => {
    expect(
      await resolveBetterAuthAdmin(requestHeaders),
    ).toBeNull();

    expect(
      mocks.resolveActiveAppIdentity,
    ).not.toHaveBeenCalled();

    expect(mocks.getSession).toHaveBeenCalledWith({
      headers: requestHeaders,
      query: { disableCookieCache: true },
    });
  });

  it("rejects an inconsistent session user ID", async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: authUserId },
      session: {
        userId: "d7b5cb5f-b4ad-4c30-9fe2-3671e6807c20",
      },
    });

    expect(
      await resolveBetterAuthAdmin(requestHeaders),
    ).toBeNull();

    expect(
      mocks.resolveActiveAppIdentity,
    ).not.toHaveBeenCalled();
  });

  it("allows an active administrator resolved from MySQL", async () => {
    mocks.getSession.mockResolvedValue(validSession());

    mocks.resolveActiveAppIdentity.mockResolvedValue({
      appUserId,
      role: "admin",
    });

    expect(
      await resolveBetterAuthAdmin(requestHeaders),
    ).toEqual({
      betterAuthUserId: authUserId,
      appUserId,
      role: "admin",
    });

    expect(
      mocks.resolveActiveAppIdentity,
    ).toHaveBeenCalledExactlyOnceWith(authUserId);
  });

  it("allows active learners only at the identity layer", async () => {
    mocks.getSession.mockResolvedValue(validSession());

    mocks.resolveActiveAppIdentity.mockResolvedValue({
      appUserId,
      role: "learner",
    });

    expect(
      await resolveActiveBetterAuthSession(requestHeaders),
    ).toEqual({
      betterAuthUserId: authUserId,
      appUserId,
      role: "learner",
    });

    expect(
      await resolveBetterAuthAdmin(requestHeaders),
    ).toBeNull();
  });

  it("denies missing or inactive application identities", async () => {
    mocks.getSession.mockResolvedValue(validSession());
    mocks.resolveActiveAppIdentity.mockResolvedValue(null);

    expect(
      await resolveBetterAuthAdmin(requestHeaders),
    ).toBeNull();

    expect(
      mocks.resolveActiveAppIdentity,
    ).toHaveBeenCalledWith(authUserId);
  });

  it("does not grant access when session validation fails", async () => {
    mocks.getSession.mockRejectedValue(
      new Error("Authentication service unavailable"),
    );

    await expect(
      resolveBetterAuthAdmin(requestHeaders),
    ).rejects.toThrow("Authentication service unavailable");

    expect(
      mocks.resolveActiveAppIdentity,
    ).not.toHaveBeenCalled();
  });

  it("does not grant access when identity lookup fails", async () => {
    mocks.getSession.mockResolvedValue(validSession());

    mocks.resolveActiveAppIdentity.mockRejectedValue(
      new Error("Database unavailable"),
    );

    await expect(
      resolveBetterAuthAdmin(requestHeaders),
    ).rejects.toThrow("Database unavailable");
  });
});