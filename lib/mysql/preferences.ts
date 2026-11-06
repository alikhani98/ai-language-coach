import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { appUsers, usersProfile } from "@/lib/db/schema";
import { interfaceLanguageSchema, themePreferenceSchema } from "@/lib/validations/profile";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Only call with the app ID derived from a verified Better Auth session. */
function activeOwner(db: ReturnType<typeof getMySqlDatabase>, appUserId: string) {
  if (!UUID.test(appUserId)) throw new Error("Invalid application identity.");
  const betterAuthOwners = db.select({ id: appUsers.id }).from(appUsers)
    .where(and(eq(appUsers.id, appUserId), eq(appUsers.authProvider, "better_auth")));
  return and(
    eq(usersProfile.userId, appUserId),
    eq(usersProfile.status, "active"),
    inArray(usersProfile.userId, betterAuthOwners),
  );
}

export async function updateMySqlInterfaceLanguage(appUserId: string, value: unknown): Promise<void> {
  if (!UUID.test(appUserId)) throw new Error("Invalid application identity.");
  const language = interfaceLanguageSchema.parse(value);
  const db = getMySqlDatabase();
  await db.update(usersProfile).set({ interfaceLanguage: language })
    .where(activeOwner(db, appUserId));
}

export async function updateMySqlThemePreference(appUserId: string, value: unknown): Promise<void> {
  if (!UUID.test(appUserId)) throw new Error("Invalid application identity.");
  const preference = themePreferenceSchema.parse(value);
  const db = getMySqlDatabase();
  await db.update(usersProfile).set({ themePreference: preference })
    .where(activeOwner(db, appUserId));
}
