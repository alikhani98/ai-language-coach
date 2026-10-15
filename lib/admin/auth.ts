import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const user = await requireUser();
  if (user.app_metadata?.role !== "admin") redirect("/dashboard");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_app_admin");
  if (error || data !== true) redirect("/dashboard");
  return { user, supabase };
}
