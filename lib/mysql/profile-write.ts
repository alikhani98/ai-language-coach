import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { appUsers, usersProfile } from "@/lib/db/schema";
import { profileSchema } from "@/lib/validations/profile";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Convert untrusted profile fields to an allowlisted MySQL update.
 * Never accept account status, approval, role or ownership from a form.
 */
export function buildMySqlProfileUpdate(input: unknown) {
  const parsed = profileSchema.parse(input);
  return {
    level: parsed.level,
    goal: parsed.goal,
    dailyMinutes: parsed.daily_minutes,
    timezone: parsed.timezone,
    interfaceLanguage: parsed.interface_language,
    themePreference: parsed.theme_preference,
  };
}

/**
 * Caller must supply appUserId from resolveActiveBetterAuthSession.
 * This repository method is not connected to public server actions yet.
 */
export async function updateMySqlProfile(appUserId: string, input: unknown): Promise<void> {
  if (!UUID_PATTERN.test(appUserId)) {
    throw new Error("Invalid application identity.");
  }
  const changes = buildMySqlProfileUpdate(input);
  const db = getMySqlDatabase();
  const betterAuthUsers = db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(and(eq(appUsers.id, appUserId), eq(appUsers.authProvider, "better_auth")));

  await db.update(usersProfile)
    .set(changes)
    .where(and(
      eq(usersProfile.userId, appUserId),
      inArray(usersProfile.userId, betterAuthUsers),
    ));
}
