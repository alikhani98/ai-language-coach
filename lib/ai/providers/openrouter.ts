import type { AIJsonRequest, AIProvider, AIProviderConfig } from "@/lib/ai/provider";
import {
  AIProviderError,
  buildJsonChatPayload,
  fetchJsonWithTimeout,
  mapProviderHttpError,
  parseProviderJsonResponse,
  withAIRetry,
} from "@/lib/ai/providers/json";

const defaultOpenRouterBaseUrl = "https://openrouter.ai/api/v1";

export function createOpenRouterProvider(config: AIProviderConfig): AIProvider {
  const generate = (request: AIJsonRequest, model?: string) =>
    withAIRetry(() => requestOpenRouterJson({ ...config, model: model ?? config.model }, request));

  return {
    generateDailyLesson: (request) => generate(request, config.lessonModel),
    generateConversationResponse: (request) => generate(request, config.conversationModel),
    analyzeMistake: (request) => generate(request, config.analysisModel),
  };
}

async function requestOpenRouterJson(
  config: AIProviderConfig,
  request: AIJsonRequest,
) {
  if (!config.openRouterApiKey) {
    throw new AIProviderError(
      "OPENROUTER_API_KEY is required for the OpenRouter AI provider.",
      "missing_config",
    );
  }

  if (!config.model) {
    throw new AIProviderError(
      "AI_MODEL is required for the OpenRouter AI provider.",
      "missing_config",
    );
  }

  const baseUrl = (config.baseUrl ?? defaultOpenRouterBaseUrl).replace(/\/$/, "");
  const response = await fetchJsonWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildJsonChatPayload(request, config.model)),
    },
    config.timeoutMs,
  );

  if (!response.ok) {
    throw mapProviderHttpError(response.status);
  }

  return parseProviderJsonResponse(await response.json());
}
