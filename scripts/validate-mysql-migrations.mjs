import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(root, "drizzle", "0000_mysql_foundation.sql");
const sql = await readFile(migrationPath, "utf8");

const required = [
  "CREATE TABLE `app_users`",
  "CREATE TABLE `users_profile`",
  "CREATE TABLE `daily_lessons`",
  "CREATE TABLE `conversations`",
  "CREATE TABLE `conversation_messages`",
  "CREATE TABLE `mistakes`",
  "CREATE TABLE `practice_logs`",
  "CREATE TABLE `learning_memory`",
  "CREATE TABLE `admin_audit_logs`",
  "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  "FOREIGN KEY",
  "CHECK (",
  "JSON_TYPE",
];
const forbidden = [
  /\bjsonb\b/i,
  /\btimestamptz\b/i,
  /\bpg_/i,
  /\bauth\.uid\b/i,
  /\brow level security\b/i,
  /\bcreate policy\b/i,
  /\bplpgsql\b/i,
];

for (const value of required) {
  if (!sql.includes(value)) throw new Error(`Missing required MySQL schema element: ${value}`);
}
for (const expression of forbidden) {
  if (expression.test(sql)) throw new Error(`PostgreSQL-only construct found: ${expression}`);
}

console.log("MySQL foundation migration passed static compatibility checks.");
