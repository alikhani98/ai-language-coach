import "server-only";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { user as authUser, account } from "@/lib/db/auth-schema";
import { appUsers, usersProfile, adminAuditLogs } from "@/lib/db/schema";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const adminCreateUserSchema = z.object({
  email: z.email().max(255).transform(s => s.trim().toLowerCase()),
  name: z.string().trim().min(2).max(255).refine(s => !/[\x00-\x1f\x7f]/.test(s)),
  password: z.string().min(16).max(128),
  language: z.enum(["en", "fa"]).default("fa"),
}).strict();
export type CreateResult = "saved" | "invalid" | "conflict" | "failed";

/** Admin-only, no email delivery. Every table write and audit entry is atomic. */
export async function createMySqlAdminUser(actorId: string, input: unknown): Promise<CreateResult> {
  if (!uuid.test(actorId)) return "invalid";
  const result = adminCreateUserSchema.safeParse(input);
  if (!result.success) return "invalid";
  const { email, name, password, language } = result.data;
  // Deliberately hash before opening a transaction to minimize lock contention.
  const passwordHash = await hashPassword(password);
  const authId = randomUUID(), accountId = randomUUID();
  const appId = randomUUID(), profileId = randomUUID();
  try {
    return await getMySqlDatabase().transaction(async (tx): Promise<CreateResult> => {
      const actor = await tx.select({ id: appUsers.id }).from(appUsers)
        .innerJoin(usersProfile, eq(usersProfile.userId, appUsers.id))
        .where(and(eq(appUsers.id, actorId), eq(appUsers.authProvider, "better_auth"),
          eq(appUsers.role, "admin"), eq(usersProfile.status, "active")))
        .for("update").limit(1);
      if (!actor.length) return "failed";
      const exists = await tx.select({ id: authUser.id }).from(authUser)
        .where(eq(authUser.email, email)).limit(1);
      if (exists.length) return "conflict";
      await tx.insert(authUser).values({ id: authId, name, email, emailVerified: false });
      await tx.insert(account).values({ id: accountId, accountId: authId,
        providerId: "credential", userId: authId, password: passwordHash, updatedAt: new Date() });
      await tx.insert(appUsers).values({ id: appId, authProvider: "better_auth", authSubjectId: authId, role: "learner" });
      await tx.insert(usersProfile).values({ id: profileId, userId: appId,
        level: "a1_beginner", goal: "conversation", dailyMinutes: 15,
        timezone: "UTC", interfaceLanguage: language, themePreference: "system",
        status: "active", approvedBy: actorId,
        approvedAt: new Date().toISOString().slice(0, 23).replace("T", " ") });
      // Existing MySQL enum is retained for a zero-DDL migration; the semantic
      // event is recorded and exposed by adminRead as 'user_created'.
      await tx.insert(adminAuditLogs).values({ id: randomUUID(), adminUserId: actorId,
        targetUserId: appId, action: "user_updated", metadata: { event: "user_created" } });
      return "saved";
    });
  } catch (error) {
    const errno = error && typeof error === "object" && "errno" in error ? error.errno : null;
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    return code === "ER_DUP_ENTRY" || errno === 1062 ? "conflict" : "failed";
  }
}
