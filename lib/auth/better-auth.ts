import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getMySqlDatabase } from "@/lib/db/client";
import { getCanonicalAppOrigin } from "@/lib/app-url";
import * as authSchema from "@/lib/db/auth-schema";

let instance: ReturnType<typeof createBetterAuthInstance> | undefined;

/**
 * Better Auth is deliberately not connected to public routes yet.
 * Initialization is lazy, server-only, and requires explicit secrets.
 */
function createBetterAuthInstance() {


  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET must contain at least 32 bytes.",
    );
  }

  const baseURL = getCanonicalAppOrigin();

  if (!baseURL) {
    throw new Error("APP_URL is required for Better Auth.");
  }

  return betterAuth({
    baseURL,
    secret,
    database: drizzleAdapter(getMySqlDatabase(), {
      provider: "mysql",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: false,
    },
    telemetry: {
      enabled: false,
    },
  });


}
export function getBetterAuth() {
  if (!instance) {
    instance = createBetterAuthInstance();
  }

  return instance;
}