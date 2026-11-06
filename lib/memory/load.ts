import { createClient } from "@/lib/supabase/server";
import { isMySqlPreviewEnabled } from "@/lib/auth/backend-mode";
import { getLocalDateKey } from "@/lib/daily/date";
import { buildLearnerMemory, type LearnerMemory } from "@/lib/memory/learnerMemory";
import type { UserProfile } from "@/lib/actions/profile";

export type LearningMemoryResult =
  | { status: "ready"; memory: LearnerMemory }
  | { status: "unavailable" };

// Internal server module, not a callable Server Action. Accept only requireProfile's
// profile. RLS and the owner check also protect against an accidentally wrong ID.
export async function loadLearningMemory(profile: UserProfile, refresh = false): Promise<LearningMemoryResult> {
  if (isMySqlPreviewEnabled()) {
    try {
      const [{ headers }, { resolveActiveBetterAuthSession }, { loadMySqlLearningMemoryCache }] = await Promise.all([
        import("next/headers"), import("@/lib/auth/session"), import("@/lib/mysql/memory-cache"),
      ]);
      const identity = await resolveActiveBetterAuthSession(await headers());
      if (!identity || identity.appUserId !== profile.user_id) return { status: "unavailable" };
      if (!refresh) {
        const cached = await loadMySqlLearningMemoryCache(identity.appUserId, profile.timezone);
        if (cached.status === "ready") return cached;
      }
      const { rebuildMySqlLearningMemory } = await import("@/lib/mysql/memory-rebuild");
      return rebuildMySqlLearningMemory(identity.appUserId, profile.timezone);
    } catch {
      return { status: "unavailable" };
    }
  }
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || auth.user?.id !== profile.user_id) return { status: "unavailable" };
    const today = getLocalDateKey(new Date(), profile.timezone);
    if (!refresh) {
      const { data, error } = await supabase.from("learning_memory")
        .select("user_id,schema_version,as_of,snapshot,updated_at")
        .eq("user_id", auth.user.id).abortSignal(AbortSignal.timeout(4000)).maybeSingle();
      const age = data ? Date.now() - Date.parse(data.updated_at) : Infinity;
      if (!error && data?.user_id === auth.user.id && data.schema_version === 1
        && data.as_of === today && age >= 0 && age < 5 * 60 * 1000) {
        // Malformed cache falls through to a canonical rebuild.
        try { return { status: "ready", memory: buildLearnerMemory(data.snapshot, data.as_of) }; } catch { /* rebuild */ }
      }
    }
    const { data, error } = await supabase.rpc("refresh_learning_memory")
      .abortSignal(AbortSignal.timeout(4000));
    if (error || !data) return { status: "unavailable" };
    return { status: "ready", memory: buildLearnerMemory(data, today) };
  } catch {
    // Missing migration, network issues, or invalid snapshots cannot fail learning.
    return { status: "unavailable" };
  }
}

export async function refreshLearningMemory(profile: UserProfile) {
  return loadLearningMemory(profile, true);
}
