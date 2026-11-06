import "server-only";

import { randomUUID } from "node:crypto";
import { and, count, desc, eq, like, sql } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { user as authUser } from "@/lib/db/auth-schema";
import { adminAuditLogs, appUsers, learningMemory, usersProfile } from "@/lib/db/schema";
import { adminMutationSchema, transitions, userFiltersSchema, type AccountStatus } from "@/lib/admin/model";
import { mapMySqlProfile, formatMySqlUtcDateTime } from "@/lib/mysql/profile";
import type { AdminUser, UserList, AuditList } from "@/lib/admin/data";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pageSize = 25;

function assertAppUserId(id: string) {
  if (!UUID.test(id)) throw new Error("Invalid application identity.");
}

/** Query parameters are untrusted; only known RPC-equivalent keys are accepted. */
export function parseMySqlAdminReadArgs(name: string, args: Record<string, unknown>) {
  if (name === "admin_users") {
    return { name: "admin_users" as const, ...userFiltersSchema.parse({
      search: args.p_search ?? "", status: args.p_status ?? "", page: args.p_page ?? 1,
    }) };
  }
  if (name === "admin_audit") {
    return { name: "admin_audit" as const, page: userFiltersSchema.parse({ page: args.p_page ?? 1 }).page };
  }
  if (name === "admin_user_detail") {
    if (typeof args.p_target !== "string" || !UUID.test(args.p_target)) {
      throw new Error("Invalid target identity.");
    }
    return { name: "admin_user_detail" as const, target: args.p_target };
  }
  throw new Error("Unsupported administrator query.");
}

const selectedUser = {
  profile: {
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
  },
  email: authUser.email,
} as const;

function mapAdminUser(row: {
  profile: {
    id: string; userId: string; level: string; goal: string;
    dailyMinutes: number; timezone: string;
    interfaceLanguage: "en" | "fa";
    themePreference: "light" | "dark" | "system" | "auto";
    createdAt: string; status: AccountStatus;
  };
  email: string;
}): AdminUser {
  const profile = mapMySqlProfile(row.profile);
  return { ...profile, status: row.profile.status, email: row.email, last_sign_in_at: null };
}

function escapeLike(value: string) {
  // MySQL LIKE escape character is backslash. All wildcard characters are literals.
  return value.replace(/[\\%_]/g, (part) => `\\${part}`);
}

/** All readers operate only after a freshly checked Better Auth admin session. */
export async function readMySqlAdminData(
  actorAppUserId: string,
  name: string,
  args: Record<string, unknown> = {},
): Promise<UserList | AdminUser | AuditList | null> {
  assertAppUserId(actorAppUserId);
  const parsed = parseMySqlAdminReadArgs(name, args);
  const db = getMySqlDatabase();

  // Recheck current database authorization instead of relying solely on a role claim.
  const actor = await db.select({ id: appUsers.id }).from(appUsers)
    .innerJoin(usersProfile, eq(usersProfile.userId, appUsers.id))
    .where(and(eq(appUsers.id, actorAppUserId), eq(appUsers.authProvider, "better_auth"),
      eq(appUsers.role, "admin"), eq(usersProfile.status, "active")))
    .limit(1);
  if (!actor.length) return null;

  if (parsed.name === "admin_users") {
    const clauses = [eq(appUsers.authProvider, "better_auth")];
    if (parsed.status) clauses.push(eq(usersProfile.status, parsed.status));
    if (parsed.search) clauses.push(like(authUser.email, `%${escapeLike(parsed.search)}%`));
    const [rows, totals, counts] = await Promise.all([
      db.select(selectedUser).from(usersProfile)
        .innerJoin(appUsers, eq(appUsers.id, usersProfile.userId))
        .innerJoin(authUser, eq(authUser.id, appUsers.authSubjectId))
        .where(and(...clauses)).orderBy(desc(usersProfile.createdAt), desc(usersProfile.userId))
        .limit(pageSize).offset((parsed.page - 1) * pageSize),
      db.select({ value: count() }).from(usersProfile)
        .innerJoin(appUsers, eq(appUsers.id, usersProfile.userId))
        .innerJoin(authUser, eq(authUser.id, appUsers.authSubjectId))
        .where(and(...clauses)),
      db.select({ status: usersProfile.status, value: count() }).from(usersProfile)
        .innerJoin(appUsers, eq(appUsers.id, usersProfile.userId))
        .innerJoin(authUser, eq(authUser.id, appUsers.authSubjectId))
        .where(eq(appUsers.authProvider, "better_auth"))
        .groupBy(usersProfile.status),
    ]);
    const statusCounts: UserList["counts"] = {};
    for (const item of counts) statusCounts[item.status] = Number(item.value);
    return { users: rows.map(mapAdminUser), total: Number(totals[0]?.value ?? 0), counts: statusCounts };
  }

  if (parsed.name === "admin_user_detail") {
    const rows = await db.select(selectedUser).from(usersProfile)
      .innerJoin(appUsers, eq(appUsers.id, usersProfile.userId))
      .innerJoin(authUser, eq(authUser.id, appUsers.authSubjectId))
      .where(and(eq(usersProfile.userId, parsed.target), eq(appUsers.authProvider, "better_auth")))
      .limit(1);
    if (!rows[0]) return null;
    const user = mapAdminUser(rows[0]);
    const cache = await db.select({ snapshot: learningMemory.snapshot, as_of: learningMemory.asOf })
      .from(learningMemory).where(eq(learningMemory.userId, parsed.target)).limit(1);
    return { ...user, memory: cache[0] ?? null };
  }

  if (parsed.name === "admin_audit") {
    const [rows, totals] = await Promise.all([
      db.select({
        id: adminAuditLogs.id,
        adminUserId: adminAuditLogs.adminUserId,
        targetUserId: adminAuditLogs.targetUserId,
        action: adminAuditLogs.action,
        createdAt: adminAuditLogs.createdAt,
      }).from(adminAuditLogs)
        .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
        .limit(pageSize).offset((parsed.page - 1) * pageSize),
      db.select({ value: count() }).from(adminAuditLogs),
    ]);
    return { total: Number(totals[0]?.value ?? 0), logs: rows.map((row) => ({
      id: row.id, admin_user_id: row.adminUserId, target_user_id: row.targetUserId,
      action: row.action, created_at: formatMySqlUtcDateTime(row.createdAt),
    })) };
  }
  return null;
}

export type MySqlAdminMutationResult = "saved" | "invalid" | "conflict" | "failed";

/** Fixed transition table; no client-chosen status or role is ever written. */
export function determineMySqlAdminTransition(
  current: AccountStatus, action: string, isTargetAdmin: boolean, self: boolean,
): AccountStatus | "conflict" {
  if (self || isTargetAdmin) return "conflict";
  if (action === "user_updated") return current;
  if (!(action in transitions)) return "conflict";
  const pair = transitions[action as keyof typeof transitions];
  return current === pair[0] ? pair[1] : "conflict";
}

/** Atomic administrator status/profile update and audit entry. */
export async function mutateMySqlAdminUser(
  actorAppUserId: string, input: unknown,
): Promise<MySqlAdminMutationResult> {
  if (!UUID.test(actorAppUserId)) return "invalid";
  const parsed = adminMutationSchema.safeParse(input);
  if (!parsed.success) return "invalid";
  const mutation = parsed.data;
  if (mutation.target === actorAppUserId) return "conflict";

  try {
    return await getMySqlDatabase().transaction(async (tx) => {
      const actor = await tx.select({ id: appUsers.id }).from(appUsers)
        .innerJoin(usersProfile, eq(usersProfile.userId, appUsers.id))
        .where(and(eq(appUsers.id, actorAppUserId), eq(appUsers.authProvider, "better_auth"),
          eq(appUsers.role, "admin"), eq(usersProfile.status, "active")))
        .for("update").limit(1);
      if (!actor.length) return "failed";

      const target = await tx.select({
        id: appUsers.id, role: appUsers.role, status: usersProfile.status,
      }).from(appUsers)
        .innerJoin(usersProfile, eq(usersProfile.userId, appUsers.id))
        .where(and(eq(appUsers.id, mutation.target), eq(appUsers.authProvider, "better_auth")))
        .for("update").limit(1);
      if (!target.length) return "conflict";
      const next = determineMySqlAdminTransition(
        target[0].status, mutation.action, target[0].role === "admin", false,
      );
      if (next === "conflict") return "conflict";

      if (mutation.action === "user_updated") {
        const { buildMySqlProfileUpdate } = await import("@/lib/mysql/profile-write");
        await tx.update(usersProfile).set(buildMySqlProfileUpdate(mutation.profile))
          .where(eq(usersProfile.userId, mutation.target));
      } else {
        await tx.update(usersProfile).set({
          status: next,
          ...(mutation.action === "user_approved" ? {
            approvedAt: sql`CURRENT_TIMESTAMP(3)`, approvedBy: actorAppUserId,
          } : {}),
        }).where(eq(usersProfile.userId, mutation.target));
      }

      await tx.insert(adminAuditLogs).values({
        id: randomUUID(), adminUserId: actorAppUserId, targetUserId: mutation.target,
        action: mutation.action,
        metadata: mutation.action === "user_updated"
          ? { fields: ["level", "goal", "daily_minutes", "timezone", "interface_language", "theme_preference"] }
          : { previous_status: target[0].status, next_status: next },
      });
      return "saved";
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    const errno = error && typeof error === "object" && "errno" in error ? error.errno : null;
    return code === "ER_LOCK_DEADLOCK" || code === "ER_LOCK_WAIT_TIMEOUT" ||
      errno === 1213 || errno === 1205 ? "conflict" : "failed";
  }
}
