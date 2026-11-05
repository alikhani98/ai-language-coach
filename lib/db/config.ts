import { z } from "zod";
import type { PoolOptions } from "mysql2";

const mysqlEnvironmentSchema = z.object({
  MYSQL_HOST: z.string().trim().min(1),
  MYSQL_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  MYSQL_DATABASE: z.string().trim().min(1).max(64),
  MYSQL_USER: z.string().trim().min(1).max(32),
  MYSQL_PASSWORD: z.string().min(1),
});

export type MySqlConnectionConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

const poolLimits = {
  connectionLimit: 3,
  maxIdle: 3,
  idleTimeout: 60_000,
  connectTimeout: 10_000,
  queueLimit: 20,
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: "Z",
} as const;

/**
 * Reads MySQL configuration only when the database is first requested. Do not
 * call this from middleware, module scope, or static generation.
 */
export function getMySqlConnectionConfig(
  environment: Record<string, string | undefined> = process.env,
): MySqlConnectionConfig {
  const parsed = mysqlEnvironmentSchema.parse(environment);
  return {
    host: parsed.MYSQL_HOST,
    port: parsed.MYSQL_PORT,
    database: parsed.MYSQL_DATABASE,
    user: parsed.MYSQL_USER,
    password: parsed.MYSQL_PASSWORD,
  };
}

/**
 * Shared-hosting pool limits. The client initializes this lazily at runtime;
 * this helper only builds options and never opens a connection.
 */
export function getMySqlPoolOptions(
  environment: Record<string, string | undefined> = process.env,
): PoolOptions {
  return {
    ...getMySqlConnectionConfig(environment),
    ...poolLimits,
  };
}
