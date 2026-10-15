import { beforeEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => vi.resetModules());
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rpc: vi.fn(),
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
import { requireAdmin } from "@/lib/admin/auth";
import { changeUser } from "@/lib/actions/admin";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({
    id: "admin",
    app_metadata: { role: "admin" },
  });
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});
describe("server admin boundary", () => {
  it("rejects non-admin even with user metadata role", async () => {
    mocks.requireUser.mockResolvedValue({
      id: "user",
      app_metadata: {},
      user_metadata: { role: "admin" },
    });
    await expect(requireAdmin()).rejects.toThrow("redirect:/dashboard");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects expired sessions before accessing admin data", async () => {
    mocks.requireUser.mockRejectedValue(new Error("redirect:/login"));
    await expect(requireAdmin()).rejects.toThrow("redirect:/login");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rechecks fresh role and active status at the database", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(requireAdmin()).rejects.toThrow("redirect:/dashboard");
  });
  it("authorizes before parsing any target", async () => {
    mocks.requireUser.mockRejectedValue(new Error("denied"));
    await expect(changeUser({}, new FormData())).rejects.toThrow("denied");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not execute mutation for malformed target", async () => {
    const form = new FormData();
    form.set("target", "invalid");
    form.set("action", "user_approved");
    expect(await changeUser({}, form)).toEqual({ result: "invalid" });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("sends only validated inputs to transactional audit RPC and revalidates", async () => {
    const form = new FormData();
    form.set("target", "90000000-0000-4000-8000-000000000002");
    form.set("action", "user_approved");
    form.set("admin_user_id", "forged");
    expect(await changeUser({}, form)).toEqual({ result: "saved" });
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_change_user", {
      p_target: "90000000-0000-4000-8000-000000000002",
      p_action: "user_approved",
      p_profile: null,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
  it.each(["40001", "42501", "P0002", "XX000"])(
    "sanitizes %s database errors",
    async (code) => {
      mocks.rpc
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({
          error: { code, message: "secret database internals" },
        });
      const form = new FormData();
      form.set("target", "90000000-0000-4000-8000-000000000002");
      form.set("action", "user_approved");
      expect(await changeUser({}, form)).toEqual({
        result: code === "40001" ? "conflict" : "failed",
      });
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );
});
