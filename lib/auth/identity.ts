import "server-only";

import { and, eq } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { appUsers, usersProfile } from "@/lib/db/schema";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolve a verified Better Auth session user ID to the
 * application's stable identity.
 *
 * Only call with user.id obtained from a server-validated session.
 * Never trust a user ID supplied directly by the browser.
 *
 * Missing, pending, suspended, and rejected users fail closed.
 * This function does not create or modify database records.
 */
export async function resolveActiveAppIdentity(betterAuthUserId: string) {
  if (!UUID_PATTERN.test(betterAuthUserId)) {
    return null;
  }

  const rows = await getMySqlDatabase()
    .select({
      appUserId: appUsers.id,
      role: appUsers.role,
    })
    .from(appUsers)
    .innerJoin(
      usersProfile,
      eq(usersProfile.userId, appUsers.id),
    )
    .where(
      and(
        eq(appUsers.authProvider, "better_auth"),
        eq(appUsers.authSubjectId, betterAuthUserId),
        eq(usersProfile.status, "active"),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}