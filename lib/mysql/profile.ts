import "server-only";

import { and, eq } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { appUsers, usersProfile } from "@/lib/db/schema";
import type { UserProfile } from "@/lib/actions/profile";
import { profileSchema } from "@/lib/validations/profile";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertTrustedAppUserId(appUserId: string): void {
  if (!UUID_PATTERN.test(appUserId)) {
    throw new Error("Invalid application identity.");
  }
}

/** MySQL DATETIME is UTC by contract; preserve the ISO timestamps used by the UI. */
export function formatMySqlUtcDateTime(value: string): string {
  const match =
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?$/.exec(value);
  if (!match) throw new Error("Unexpected database timestamp.");
  const millis = (match[3] ?? "").padEnd(3, "0");
  const iso = `${match[1]}T${match[2]}.${millis}Z`;
  if (Number.isNaN(Date.parse(iso))) {
    throw new Error("Unexpected database timestamp.");
  }
  return iso;
}

type ProfileRow = {
  id: string;
  userId: string;
  level: string;
  goal: string;
  dailyMinutes: number;
  timezone: string;
  interfaceLanguage: "en" | "fa";
  themePreference: "light" | "dark" | "system" | "auto";
  createdAt: string;
  status: "pending" | "active" | "suspended" | "rejected";
};

/** Keep the existing UI-facing profile contract, but reject corrupt MySQL rows. */
export function mapMySqlProfile(row: ProfileRow): UserProfile {
  const validated = profileSchema.parse({
    level: row.level,
    goal: row.goal,
    daily_minutes: row.dailyMinutes,
    timezone: row.timezone,
    interface_language: row.interfaceLanguage,
    theme_preference: row.themePreference,
  });

  return {
    id: row.id,
    user_id: row.userId,
    ...validated,
    created_at: formatMySqlUtcDateTime(row.createdAt),
    status: row.status,
  };
}

/**
 * Read an application profile for an already server-verified appUserId.
 * The caller must obtain appUserId from a trusted Better Auth session, never
 * from a form field, query parameter, or browser-supplied identifier.
 *
 * This module is not wired to the public UI until the controlled cutover.
 */
export async function getMySqlProfile(appUserId: string): Promise<UserProfile | null> {
  assertTrustedAppUserId(appUserId);

  const rows = await getMySqlDatabase()
    .select({
      id: usersProfile.id,
      userId: usersProfile.userId,
      level: usersProfile.level,
      goal: usersProfile.goal,
      dailyMinutes: usersProfile.dailyMinutes,
      timezone: usersProfile.timezone,
      interfaceLanguage: usersProfile.interfaceLanguage,
      themePreference: usersProfile.themePreference,
      createdAt: usersProfile.createdAt,
      status: usersProfile.status,
    })
    .from(usersProfile)
    .innerJoin(appUsers, eq(appUsers.id, usersProfile.userId))
    .where(
      and(
        eq(appUsers.id, appUserId),
        eq(appUsers.authProvider, "better_auth"),
      ),
    )
    .limit(1);

  return rows[0] ? mapMySqlProfile(rows[0]) : null;
}
