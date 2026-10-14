import type { AIJsonRequest, AIProvider, AIProviderConfig } from "@/lib/ai/provider";
import {
  AIProviderError,
  buildJsonChatPayload,
  fetchJsonWithTimeout,
  mapProviderHttpError,
  parseProviderJsonResponse,
  withAIRetry,
} from "@/lib/ai/providers/json";

export function createLocalProvider(config: AIProviderConfig): AIProvider {
  const generate = (request: AIJsonRequest, model?: string) =>
    withAIRetry(() => requestLocalJson({ ...config, model: model ?? config.model }, request));

  return {
    generateDailyLesson: (request) => generate(request, config.lessonModel),
    generateConversationResponse: (request) => generate(request, config.conversationModel),
    analyzeMistake: (request) => generate(request, config.analysisModel),
  };
}

async function requestLocalJson(config: AIProviderConfig, request: AIJsonRequest) {
  const baseUrl = (config.localBaseUrl ?? config.baseUrl)?.replace(/\/$/, "");

  if (!baseUrl) {
    throw new AIProviderError(
      "LOCAL_AI_BASE_URL or AI_BASE_URL is required for the local AI provider.",
      "missing_config",
    );
  }

  if (!config.model) {
    throw new AIProviderError(
      "AI_MODEL is required for the local AI provider.",
      "missing_config",
    );
  }

  const response = await fetchJsonWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
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
