import { randomUUID } from "node:crypto";
import { open, unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { z } from "zod";

function sqlUtf8(value) {
  return `CONVERT(0x${Buffer.from(value, "utf8").toString("hex")} USING utf8mb4)`;
}

export async function buildAdminBootstrap({ email, name, password }) {
  if (
    typeof email !== "string" ||
    typeof name !== "string" ||
    typeof password !== "string"
  ) {
    throw new Error("Invalid bootstrap input.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name.trim();

  if (
    normalizedEmail.length > 255 ||
    !z.email().safeParse(normalizedEmail).success
  ) {
    throw new Error("Invalid administrator email.");
  }

  if (
    displayName.length < 2 ||
    displayName.length > 255 ||
    /[\x00-\x1f\x7f]/.test(displayName)
  ) {
    throw new Error("Invalid administrator display name.");
  }

  if (password.length < 16 || password.length > 128) {
    throw new Error("Administrator password must be 16-128 characters.");
  }

  const passwordHash = await hashPassword(password);

  if (!(await verifyPassword({ hash: passwordHash, password }))) {
    throw new Error("Password hashing verification failed.");
  }

  const authId = randomUUID();
  const accountId = randomUUID();
  const appUserId = randomUUID();
  const profileId = randomUUID();
  const auditId = randomUUID();

  const sql = [
    "-- Private, one-time Zaban administrator bootstrap.",
    "-- Contains a password hash. Never commit or publish.",
    "SET SESSION time_zone = '+00:00';",
    "SELECT GET_LOCK('zaban_admin_bootstrap_v1', 10) INTO @zaban_bootstrap_lock;",
    "SELECT",
    "NOT EXISTS (SELECT 1 FROM `user`)",
    "AND NOT EXISTS (SELECT 1 FROM `account`)",
    "AND NOT EXISTS (SELECT 1 FROM `session`)",
    "AND NOT EXISTS (SELECT 1 FROM `verification`)",
    "AND NOT EXISTS (SELECT 1 FROM `app_users`)",
    "AND NOT EXISTS (SELECT 1 FROM `users_profile`)",
    "AND NOT EXISTS (SELECT 1 FROM `admin_audit_logs`)",
    "INTO @zaban_bootstrap_empty;",
    "START TRANSACTION;",

    "INSERT INTO `user`",
    "(`id`, `name`, `email`, `email_verified`, `created_at`, `updated_at`)",
    `SELECT '${authId}', ${sqlUtf8(displayName)}, ${sqlUtf8(normalizedEmail)}, 0, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3)`,
    "FROM DUAL",
    "WHERE @zaban_bootstrap_lock = 1 AND @zaban_bootstrap_empty = 1;",
    "SET @zaban_created = ROW_COUNT();",

    // Fail before other inserts if the first user was not created.
    // The missing-table statement is intentionally selected only on failure.
    "SET @zaban_guard_sql = IF(@zaban_created = 1, 'DO 1', 'SELECT * FROM `__zaban_bootstrap_precondition_failed__`');",
    "PREPARE zaban_bootstrap_assert FROM @zaban_guard_sql;",
    "EXECUTE zaban_bootstrap_assert;",
    "DEALLOCATE PREPARE zaban_bootstrap_assert;",

    "INSERT INTO `account`",
    "(`id`, `account_id`, `provider_id`, `user_id`, `password`, `created_at`, `updated_at`)",
    `VALUES ('${accountId}', '${authId}', 'credential', '${authId}', ${sqlUtf8(passwordHash)}, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3));`,

    "INSERT INTO `app_users`",
    "(`id`, `auth_provider`, `auth_subject_id`, `role`)",
    `VALUES ('${appUserId}', 'better_auth', '${authId}', 'admin');`,

    "INSERT INTO `users_profile`",
    "(`id`, `user_id`, `level`, `goal`, `daily_minutes`, `timezone`, `interface_language`, `theme_preference`, `status`, `approved_at`, `approved_by`)",
    `VALUES ('${profileId}', '${appUserId}', 'a1_beginner', 'conversation', 15, 'UTC', 'fa', 'system', 'active', UTC_TIMESTAMP(3), '${appUserId}');`,

    "INSERT INTO `admin_audit_logs`",
    "(`id`, `admin_user_id`, `target_user_id`, `action`, `metadata`, `created_at`)",
    `VALUES ('${auditId}', '${appUserId}', '${appUserId}', 'user_updated', '{"bootstrap":"initial_admin"}', UTC_TIMESTAMP(3));`,

    "COMMIT;",
    "SELECT RELEASE_LOCK('zaban_admin_bootstrap_v1');",

    "SELECT CONCAT_WS('|',",
    ` (SELECT COUNT(*) FROM \`user\` WHERE \`id\` = '${authId}'),`,
    ` (SELECT COUNT(*) FROM \`account\` WHERE \`id\` = '${accountId}'),`,
    ` (SELECT COUNT(*) FROM \`app_users\` WHERE \`id\` = '${appUserId}' AND \`role\` = 'admin'),`,
    ` (SELECT COUNT(*) FROM \`users_profile\` WHERE \`id\` = '${profileId}' AND \`status\` = 'active'),`,
    ` (SELECT COUNT(*) FROM \`admin_audit_logs\` WHERE \`id\` = '${auditId}')`,
    ");",
    "",
  ].join("\n");

  return {
    sql,
    passwordHash,
    authId,
    appUserId,
  };
}

export function parseBootstrapCredentials(input) {
  return JSON.parse(input.replace(/^\uFEFF/, ""));
}
async function main() {
  const outputArg = process.argv[2];

  if (!outputArg) {
    throw new Error("A private output path is required.");
  }

  const output = resolve(outputArg);
  const repositoryRoot = resolve(
    fileURLToPath(new URL("../", import.meta.url))
  );

  if (
    output === repositoryRoot ||
    output.startsWith(repositoryRoot + sep)
  ) {
    throw new Error("Output must be outside the Git repository.");
  }

  let input = "";

  for await (const chunk of process.stdin) {
    input += chunk.toString("utf8");

    if (input.length > 16384) {
      throw new Error("Input exceeds maximum size.");
    }
  }

  const credentials = parseBootstrapCredentials(input);
  const { sql } = await buildAdminBootstrap(credentials);

  const handle = await open(output, "wx", 0o600);

  try {
    await handle.writeFile(sql, "utf8");
  } catch (error) {
    await handle.close();
    await unlink(output);
    throw error;
  }

  await handle.close();

  console.log("Private bootstrap SQL prepared successfully.");
  console.log("No database connection or execution occurred.");
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(`Bootstrap preparation failed: ${error.message}`);
    process.exitCode = 1;
  });
}