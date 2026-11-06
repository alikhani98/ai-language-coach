import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => vi.resetModules());
const mocks = vi.hoisted(() => ({ getMySqlDatabase: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ getMySqlDatabase: mocks.getMySqlDatabase }));
// Keep the boundary-unit tests isolated from Supabase environment parsing,
// Next server actions and external AI services. No runtime credentials are needed.
vi.mock("@/lib/actions/profile", () => ({ requireProfile: vi.fn() }));
vi.mock("@/lib/learner/load", () => ({ loadLearnerContext: vi.fn() }));
vi.mock("@/lib/memory/load", () => ({ refreshLearningMemory: vi.fn() }));
vi.mock("@/lib/ai/progressCoach", () => ({ generateProgressSummary: vi.fn() }));
vi.mock("@/lib/ai/conversationCoach", () => ({ getConversationCoachReply: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  parseMySqlAdminReadArgs, determineMySqlAdminTransition,
  mutateMySqlAdminUser, readMySqlAdminData,
} from "@/lib/mysql/admin";
import {
  claimMySqlGeneration, releaseMySqlGeneration,
} from "@/lib/mysql/conversation-controller";

const actor = "90000000-0000-4000-8000-000000000001";
const target = "90000000-0000-4000-8000-000000000002";
const conversation = "90000000-0000-4000-8000-000000000003";

beforeEach(() => mocks.getMySqlDatabase.mockReset());

describe("MySQL development preview administration and conversation boundaries", () => {
  it("allows only the three known admin read operations", () => {
    expect(parseMySqlAdminReadArgs("admin_users", {})).toMatchObject({
      name: "admin_users", search: "", status: "", page: 1,
    });
    expect(parseMySqlAdminReadArgs("admin_audit", { p_page: 2 })).toEqual({
      name: "admin_audit", page: 2,
    });
    expect(parseMySqlAdminReadArgs("admin_user_detail", { p_target: target })).toEqual({
      name: "admin_user_detail", target,
    });
    expect(() => parseMySqlAdminReadArgs("arbitrary_sql", {})).toThrow();
  });

  it("rejects bad pagination, status and target values before querying", () => {
    expect(() => parseMySqlAdminReadArgs("admin_users", { p_page: -1 })).toThrow();
    expect(() => parseMySqlAdminReadArgs("admin_users", { p_status: "superuser" })).toThrow();
    expect(() => parseMySqlAdminReadArgs("admin_users", { p_search: "x".repeat(101) })).toThrow();
    expect(() => parseMySqlAdminReadArgs("admin_user_detail", { p_target: "untrusted" })).toThrow();
  });

  it("rejects self-updates and administration of other administrators", () => {
    expect(determineMySqlAdminTransition("active", "user_suspended", false, true)).toBe("conflict");
    expect(determineMySqlAdminTransition("active", "user_suspended", true, false)).toBe("conflict");
    expect(determineMySqlAdminTransition("active", "user_updated", true, false)).toBe("conflict");
  });

  it("enforces the exact administrator status transition matrix", () => {
    expect(determineMySqlAdminTransition("pending", "user_approved", false, false)).toBe("active");
    expect(determineMySqlAdminTransition("pending", "user_rejected", false, false)).toBe("rejected");
    expect(determineMySqlAdminTransition("active", "user_suspended", false, false)).toBe("suspended");
    expect(determineMySqlAdminTransition("suspended", "user_reactivated", false, false)).toBe("active");
    expect(determineMySqlAdminTransition("rejected", "user_approved", false, false)).toBe("conflict");
    expect(determineMySqlAdminTransition("active", "unknown", false, false)).toBe("conflict");
  });

  it("rejects malformed or self-directed mutations before accessing MySQL", async () => {
    expect(await mutateMySqlAdminUser("not-id", {})).toBe("invalid");
    expect(await mutateMySqlAdminUser(actor, { action: "user_approved", target: "bad-id" })).toBe("invalid");
    expect(await mutateMySqlAdminUser(actor, { action: "user_suspended", target: actor })).toBe("conflict");
    expect(await mutateMySqlAdminUser(actor, {
      action: "user_approved", target, role: "admin",
    })).toBe("invalid");
    expect(mocks.getMySqlDatabase).not.toHaveBeenCalled();
  });

  it("rejects malformed administrator session identity before querying", async () => {
    await expect(readMySqlAdminData("forged-id", "admin_users")).rejects.toThrow();
    expect(mocks.getMySqlDatabase).not.toHaveBeenCalled();
  });

  it("rejects malformed conversation claim without DB calls", async () => {
    expect(await claimMySqlGeneration("forged-id", conversation, "request-123")).toBe("unavailable");
    expect(await claimMySqlGeneration(actor, "wrong", "request-123")).toBe("unavailable");
    expect(await claimMySqlGeneration(actor, conversation, "bad")).toBe("unavailable");
    expect(mocks.getMySqlDatabase).not.toHaveBeenCalled();
  });

  it("does not release a generation lock for an invalid identity", async () => {
    await releaseMySqlGeneration("forged-id", conversation, "request-123");
    await releaseMySqlGeneration(actor, "invalid-id", "request-123");
    await releaseMySqlGeneration(actor, conversation, "short");
    expect(mocks.getMySqlDatabase).not.toHaveBeenCalled();
  });
});
