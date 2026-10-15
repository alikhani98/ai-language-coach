"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { adminMutationSchema } from "@/lib/admin/model";
export type AdminActionState = {
  result?: "saved" | "invalid" | "conflict" | "failed";
};
export async function changeUser(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { supabase } = await requireAdmin();
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
