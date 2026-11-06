import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMySqlPreviewEnabled } from "@/lib/auth/backend-mode";

export async function getCurrentUser() {
  if (isMySqlPreviewEnabled()) {
    const [{ headers }, { getBetterAuth }, { resolveActiveAppIdentity }] = await Promise.all([
      import("next/headers"),
      import("@/lib/auth/better-auth"),
      import("@/lib/auth/identity"),
    ]);
    const authenticated = await getBetterAuth().api.getSession({
      headers: await headers(),
      query: { disableCookieCache: true },
    });
    if (!authenticated?.user || !authenticated.session ||
        authenticated.session.userId !== authenticated.user.id) return null;
    const appIdentity = await resolveActiveAppIdentity(authenticated.user.id);
    if (!appIdentity) return null;
    return {
      id: appIdentity.appUserId,
      email: authenticated.user.email,
      app_metadata: { role: appIdentity.role },
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
