import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

const mocks = vi.hoisted(() => ({
  getMySqlDatabase: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  innerJoin: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db/client", () => ({
  getMySqlDatabase: mocks.getMySqlDatabase,
}));

import { resolveActiveAppIdentity } from "@/lib/auth/identity";

const authUserId = "123e4567-e89b-42d3-a456-426614174000";

describe("application identity mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getMySqlDatabase.mockReturnValue({
      select: mocks.select,
    });

    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ innerJoin: mocks.innerJoin });
    mocks.innerJoin.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({ limit: mocks.limit });
  });

  it("rejects invalid IDs without querying MySQL", async () => {
    expect(await resolveActiveAppIdentity("invalid")).toBeNull();
    expect(mocks.getMySqlDatabase).not.toHaveBeenCalled();
  });

  it("resolves an active Better Auth identity", async () => {
    const identity = {
      appUserId: "b7244d37-2aa4-4b84-bc35-f616cb1ea4a6",
      role: "learner",
    };

    mocks.limit.mockResolvedValue([identity]);

    expect(await resolveActiveAppIdentity(authUserId)).toEqual(identity);
    expect(mocks.limit).toHaveBeenCalledWith(1);

    const predicate = mocks.where.mock.calls[0][0];
    const compiled = new MySqlDialect().sqlToQuery(predicate);

    expect(compiled.params).toEqual([
      "better_auth",
      authUserId,
      "active",
    ]);
  });

  it("denies users without an active identity mapping", async () => {
    mocks.limit.mockResolvedValue([]);

    expect(await resolveActiveAppIdentity(authUserId)).toBeNull();
  });
});