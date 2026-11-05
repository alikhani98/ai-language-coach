import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = new URL("../drizzle/0000_mysql_foundation.sql", import.meta.url);

async function migrationSql() {
  return readFile(migrationPath, "utf8");
}

describe("MySQL foundation migration", () => {
  it("creates every application domain table with InnoDB Unicode storage", async () => {
    const sql = await migrationSql();
    for (const table of [
      "app_users",
      "users_profile",
      "daily_lessons",
      "conversations",
      "conversation_messages",
      "mistakes",
      "practice_logs",
      "learning_memory",
      "admin_audit_logs",
    ]) {
      expect(sql).toContain(`CREATE TABLE \`${table}\``);
    }
    expect(sql.match(/ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci/g)).toHaveLength(9);
  });

  it("keeps the relational and idempotency invariants", async () => {
    const sql = await migrationSql();
    expect(sql).toContain("ON DELETE CASCADE");
    expect(sql).toContain("ON DELETE SET NULL");
    expect(sql).toContain("`daily_lessons_user_date_unique` UNIQUE (`user_id`, `date`)");
    expect(sql).toContain("`conversation_messages_request_unique` UNIQUE (`conversation_id`, `role`, `request_id`)");
    expect(sql).toContain("`mistakes_source_message_correction_unique` UNIQUE (`source_message_id`, `correction_index`)");
    expect(sql).toContain("`users_profile_daily_minutes_check` CHECK");
    expect(sql).toContain("`learning_memory_snapshot_size_check` CHECK");
  });

  it("does not carry PostgreSQL RLS or server-function authorization into MySQL", async () => {
    const sql = await migrationSql();
    expect(sql).not.toMatch(/row level security|create policy|auth\.uid|plpgsql|jsonb/i);
    expect(sql).toContain("Application services");
  });
});
