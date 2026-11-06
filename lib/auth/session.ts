import "server-only";

import { getBetterAuth } from "@/lib/auth/better-auth";
import { resolveActiveAppIdentity } from "@/lib/auth/identity";

/**
 * Server-validated Better Auth session mapped to an active
 * application identity.
 *
 * Never use a client-supplied user ID as proof of identity.
 * Authorization roles are read from MySQL, not session claims.
 *
 * This module does not expose any HTTP route or change Supabase.
 */
export async function resolveActiveBetterAuthSession(
  requestHeaders: Headers,
) {
  const authenticated = await getBetterAuth().api.getSession({
    headers: requestHeaders,
    query: {
      disableCookieCache: true,
    },
  });

  if (!authenticated?.user || !authenticated.session) {
    return null;
  }

  const authUserId = authenticated.user.id;

  if (
    typeof authUserId !== "string" ||
    !authUserId ||
    authenticated.session.userId !== authUserId
  ) {
    return null;
  }

  const identity = await resolveActiveAppIdentity(authUserId);

  if (!identity) {
    return null;
  }

  return {
    betterAuthUserId: authUserId,
    appUserId: identity.appUserId,
    role: identity.role,
  };
}

/**
 * Only an authenticated user whose current MySQL identity
 * has role=admin and an active profile may pass.
 *
 * An absent session, revoked identity, inactive profile,
 * or learner role never grants administrator access.
 */
export async function resolveBetterAuthAdmin(
  requestHeaders: Headers,
) {
  const identity = await resolveActiveBetterAuthSession(
    requestHeaders,
  );

  if (!identity || identity.role !== "admin") {
    return null;
  }

  return identity;
}