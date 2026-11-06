import "server-only";
import { requireAdmin } from "@/lib/admin/auth";
import { isMySqlPreviewEnabled } from "@/lib/auth/backend-mode";
import type { UserProfile } from "@/lib/actions/profile";
import type { AccountStatus } from "@/lib/admin/model";
export type AdminUser = UserProfile & {
  status: AccountStatus;
  email: string;
  last_sign_in_at: string | null;
  memory?: { snapshot: unknown; as_of: string } | null;
};
export type UserList = {
  users: AdminUser[];
  total: number;
  counts: Partial<Record<AccountStatus, number>>;
};
export type AuditList = {
  total: number;
  logs: {
    id: string;
    admin_user_id: string | null;
    target_user_id: string | null;
    action:
      | "user_approved"
      | "user_rejected"
      | "user_suspended"
      | "user_reactivated"
      | "user_updated" | "user_created";
    created_at: string;
  }[];
};
export async function adminRead<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T | null> {
  if (isMySqlPreviewEnabled()) {
    const { user } = await requireAdmin();
    try {
      const { readMySqlAdminData } = await import("@/lib/mysql/admin");
      return await readMySqlAdminData(user.id, name, args) as unknown as T | null;
    } catch {
      return null;
    }
  }
  const { supabase } = await requireAdmin();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .rpc(name, args)
      .abortSignal(AbortSignal.timeout(8000));
    if (error) return null;
    return data as T;
  } catch {
    return null;
  }
}
