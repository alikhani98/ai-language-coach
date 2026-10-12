import { z } from "zod";
import { createLocalProvider } from "@/lib/ai/providers/local";
import { createOpenRouterProvider } from "@/lib/ai/providers/openrouter";

export type AIProviderName = "openrouter" | "local";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIJsonRequest = {
  messages: AIMessage[];
  schemaName: string;
  schemaHint: string;
  temperature: number;
  maxTokens: number;
};

export interface AIProvider {
  generateDailyLesson(request: AIJsonRequest): Promise<unknown>;
  generateConversationResponse(request: AIJsonRequest): Promise<unknown>;
  analyzeMistake(request: AIJsonRequest): Promise<unknown>;
}

export type AIProviderConfig = {
  provider: AIProviderName;
  model?: string;
  openRouterApiKey?: string;
  baseUrl?: string;
  localBaseUrl?: string;
  timeoutMs: number;
};

const aiProviderConfigSchema = z.object({
  AI_PROVIDER: z.enum(["openrouter", "local"]).default("openrouter"),
  OPENROUTER_API_KEY: optionalString(),
  AI_MODEL: optionalString(),
  AI_BASE_URL: optionalUrl(),
  LOCAL_AI_BASE_URL: optionalUrl(),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
});

let providerOverride: AIProvider | null = null;
let providerCache: AIProvider | null = null;

export function resolveAIProviderConfig(
  source: Record<string, string | undefined> = process.env,
): AIProviderConfig {
  const parsed = aiProviderConfigSchema.parse({
    AI_PROVIDER: source.AI_PROVIDER,
    OPENROUTER_API_KEY: source.OPENROUTER_API_KEY,
    AI_MODEL: source.AI_MODEL,
    AI_BASE_URL: source.AI_BASE_URL,
    LOCAL_AI_BASE_URL: source.LOCAL_AI_BASE_URL,
    AI_TIMEOUT_MS: source.AI_TIMEOUT_MS,
  });

  return {
    provider: parsed.AI_PROVIDER,
    model: parsed.AI_MODEL,
    openRouterApiKey: parsed.OPENROUTER_API_KEY,
    baseUrl: parsed.AI_BASE_URL,
    localBaseUrl: parsed.LOCAL_AI_BASE_URL,
    timeoutMs: parsed.AI_TIMEOUT_MS,
  };
}

export function createAIProvider(config: AIProviderConfig): AIProvider {
  if (config.provider === "local") {
    return createLocalProvider(config);
  }

  return createOpenRouterProvider(config);
}

export function getAIProvider(): AIProvider {
  if (providerOverride) {
    return providerOverride;
  }

  providerCache ??= createAIProvider(resolveAIProviderConfig());
  return providerCache;
}

export function setAIProviderForTesting(provider: AIProvider | null) {
  providerOverride = provider;
  providerCache = null;
}

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
