import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPool: vi.fn(),
  drizzle: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("mysql2/promise", () => ({ createPool: mocks.createPool }));
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: mocks.drizzle }));

describe("MySQL client initialization", () => {
  it("does not parse credentials or create a pool when the module is imported", async () => {
    await import("@/lib/db/client");
    expect(mocks.createPool).not.toHaveBeenCalled();
    expect(mocks.drizzle).not.toHaveBeenCalled();
  });
});
