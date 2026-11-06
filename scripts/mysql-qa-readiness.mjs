/** Read-only QA schema and server compatibility check. Never writes to MySQL. */
import { createPool } from "mysql2/promise";

const required = [
  "account", "admin_audit_logs", "app_users", "conversation_messages", "conversations",
  "daily_lessons", "learning_memory", "mistakes", "practice_logs", "session",
  "user", "users_profile", "verification",
];

async function main() {
  if (process.env.ZABAN_QA_DB_CHECK !== "enabled") throw Error("QA consent flag missing");
  if (process.env.APP_URL?.replace(/\/$/, "") === "https://zaban.54i.ir") {
    throw Error("Refusing QA probe with production APP_URL");
  }
  const credentials = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"];
  if (credentials.some(k => !process.env[k])) throw Error("Missing MySQL server-only configuration");
  const pool = createPool({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE, connectionLimit: 1, connectTimeout: 8000 });
  try {
    const [meta] = await pool.query("SELECT @@version AS version, @@version_comment AS server, @@session.time_zone AS tz");
    const [tables] = await pool.query(`SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()`);
    const set = new Set(tables.map(row => row.name));
    const missing = required.filter(name => !set.has(name));
    const nonInno = tables.filter(row => required.includes(row.name) && row.engine !== "InnoDB").map(row => row.name);
    const [constraints] = await pool.query(`SELECT COUNT(*) AS n FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()`);
    console.log(JSON.stringify({ qa: true, serverVersion: String(meta[0]?.version ?? "unknown"),
      requiredTableCount: required.length, missing, nonInno, foreignKeyCount: Number(constraints[0]?.n ?? 0) }, null, 2));
    if (missing.length || nonInno.length || Number(constraints[0]?.n ?? 0) < 10) process.exitCode = 1;
  } finally { await pool.end(); }
}
main().catch(() => { console.error("QA schema check failed; inspect server logs privately."); process.exitCode = 1; });
