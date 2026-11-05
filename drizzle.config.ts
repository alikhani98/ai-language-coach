import { defineConfig } from "drizzle-kit";

// `generate` only reads this placeholder configuration. No migration command is
// included in package scripts, so this project cannot apply a migration by accident.
export default defineConfig({
  dialect: "mysql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? "migration_generator",
    password: process.env.MYSQL_PASSWORD ?? "not-used-for-generation",
    database: process.env.MYSQL_DATABASE ?? "zaban_migration_generator",
  },
});
