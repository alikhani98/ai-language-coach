"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { adminMutationSchema } from "@/lib/admin/model";
import { isMySqlPreviewEnabled } from "@/lib/auth/backend-mode";
export type AdminActionState = {
  result?: "saved" | "invalid" | "conflict" | "failed";
};

/** Only an active Better Auth administrator can create users, and only in MySQL mode. */
export async function createUser(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  if (!isMySqlPreviewEnabled()) return { result: "failed" };
  const { user } = await requireAdmin();
  try {
    const { createMySqlAdminUser } = await import("@/lib/mysql/admin-create");
    const result = await createMySqlAdminUser(user.id, {
      email: formData.get("email"), name: formData.get("name"),
      password: formData.get("password"), language: formData.get("language"),
    });
    if (result === "saved") revalidatePath("/admin/users");
    return { result };
  } catch {
    return { result: "failed" };
  }
}
export async function changeUser(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { user, supabase } = await requireAdmin();
  const action = formData.get("action");
  const parsed = adminMutationSchema.safeParse({
    target: formData.get("target"),
    action,
    ...(action === "user_updated"
      ? {
          profile: Object.fromEntries(
            [
              "level",
              "goal",
              "daily_minutes",
              "timezone",
              "interface_language",
              "theme_preference",
            ].map((key) => [key, formData.get(key)]),
          ),
        }
      : {}),
  });
  if (!parsed.success) return { result: "invalid" };
  if (isMySqlPreviewEnabled()) {
    const { mutateMySqlAdminUser } = await import("@/lib/mysql/admin");
    const result = await mutateMySqlAdminUser(user.id, parsed.data);
    if (result === "saved") revalidatePath("/", "layout");
    return { result };
  }
  if (!supabase) return { result: "failed" };
  try {
    const { error } = await supabase.rpc("admin_change_user", {
      p_target: parsed.data.target,
      p_action: parsed.data.action,
      p_profile:
        parsed.data.action === "user_updated" ? parsed.data.profile : null,
    });
    if (error)
      return { result: error.code === "40001" ? "conflict" : "failed" };
  } catch {
    return { result: "failed" };
  }
  revalidatePath("/", "layout");
  return { result: "saved" };
}
