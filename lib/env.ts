import { z } from "zod";

function optionalString() {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  );
}

function optionalUrl() {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  );
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: optionalString(),
  AI_PROVIDER: z.enum(["openrouter", "local"]).default("openrouter"),
  OPENROUTER_API_KEY: optionalString(),
  AI_MODEL: optionalString(),
  AI_BASE_URL: optionalUrl(),
  LOCAL_AI_BASE_URL: optionalUrl(),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export const serverEnv = serverEnvSchema.parse({
  ...publicEnv,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  AI_PROVIDER: process.env.AI_PROVIDER,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  AI_BASE_URL: process.env.AI_BASE_URL,
  LOCAL_AI_BASE_URL: process.env.LOCAL_AI_BASE_URL,
  AI_TIMEOUT_MS: process.env.AI_TIMEOUT_MS,
});
