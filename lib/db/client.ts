import "server-only";

import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";
import { getMySqlPoolOptions } from "@/lib/db/config";
import * as domainSchema from "@/lib/db/schema";
import * as authSchema from "@/lib/db/auth-schema";

const schema = { ...domainSchema, ...authSchema };

let pool: Pool | undefined;
let database: MySql2Database<typeof schema> | undefined;

/**
 * Returns the process-local pool on first use. Importing this module does not
 * parse MySQL environment variables or open a connection, so builds and static
 * generation stay disconnected. Call it only from server-side runtime code.
 */
export function getMySqlDatabase(): MySql2Database<typeof schema> {
  if (database) return database;

  pool = createPool(getMySqlPoolOptions());
  pool.pool.on("connection", (connection) => {
    // DATETIME defaults and any SQL date expressions must have UTC session
    // semantics. Destroy the connection if the session cannot be configured.
    connection.query("SET time_zone = '+00:00'", (error) => {
      if (error) connection.destroy();
    });
  });
  database = drizzle(pool, { schema, mode: "default" });
  return database;
}

/** For controlled runtime shutdowns only; application code must not call this. */
export async function closeMySqlPoolForShutdown() {
  const activePool = pool;
  pool = undefined;
  database = undefined;
  await activePool?.end();
}
