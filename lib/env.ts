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
  APP_URL: optionalUrl(),
  SUPABASE_SERVICE_ROLE_KEY: optionalString(),
  AI_PROVIDER: z.enum(["openrouter", "local"]).default("openrouter"),
  OPENROUTER_API_KEY: optionalString(),
  AI_LESSON_MODEL: optionalString(),
  AI_CONVERSATION_MODEL: optionalString(),
  AI_ANALYSIS_MODEL: optionalString(),
  AI_MODEL: optionalString(),
  AI_BASE_URL: optionalUrl(),
  LOCAL_AI_BASE_URL: optionalUrl(),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().max(45000).default(20000),
});

// Do not parse Supabase credentials at module import. A MySQL-only release must
// be bootable without them. Accessing a legacy Supabase field still validates
// all required legacy variables and fails closed when they are absent.
const readPublic = () => publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
const readServer = () => serverEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  APP_URL: process.env.APP_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  AI_PROVIDER: process.env.AI_PROVIDER,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  AI_LESSON_MODEL: process.env.AI_LESSON_MODEL,
  AI_CONVERSATION_MODEL: process.env.AI_CONVERSATION_MODEL,
  AI_ANALYSIS_MODEL: process.env.AI_ANALYSIS_MODEL,
  AI_MODEL: process.env.AI_MODEL,
  AI_BASE_URL: process.env.AI_BASE_URL,
  LOCAL_AI_BASE_URL: process.env.LOCAL_AI_BASE_URL,
  AI_TIMEOUT_MS: process.env.AI_TIMEOUT_MS,
});
export const publicEnv: ReturnType<typeof readPublic> = new Proxy({} as ReturnType<typeof readPublic>, {
  get: (_target, key) => Reflect.get(readPublic(), key),
});
export const serverEnv: ReturnType<typeof readServer> = new Proxy({} as ReturnType<typeof readServer>, {
  get: (_target, key) => Reflect.get(readServer(), key),
});
