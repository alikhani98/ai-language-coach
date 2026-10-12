import type { AIJsonRequest, AIMessage } from "@/lib/ai/provider";

export type ChatCompletionPayload = {
  model: string;
  messages: AIMessage[];
  temperature: number;
  max_tokens: number;
  response_format: { type: "json_object" };
};

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "missing_config"
      | "rate_limited"
      | "model_unavailable"
      | "network_error"
      | "timeout"
      | "invalid_response",
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export function buildJsonChatPayload(
  request: AIJsonRequest,
  model: string,
): ChatCompletionPayload {
  return {
    model,
    temperature: request.temperature,
    max_tokens: request.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "Return only valid JSON.",
          `JSON schema name: ${request.schemaName}.`,
          `JSON shape: ${request.schemaHint}.`,
          "Do not wrap the JSON in Markdown.",
        ].join(" "),
      },
      ...request.messages,
    ],
  };
}

export async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AIProviderError("The AI provider request timed out.", "timeout");
    }

    throw new AIProviderError("The AI provider request failed.", "network_error");
  } finally {
    clearTimeout(timeout);
  }
}

export function parseProviderJsonResponse(payload: unknown): unknown {
  const content = getMessageContent(payload);

  if (!content) {
    throw new AIProviderError(
      "The AI provider returned an empty response.",
      "invalid_response",
    );
  }

  return parseJsonFromModelText(content);
}

export function mapProviderHttpError(status: number): AIProviderError {
  if (status === 429) {
    return new AIProviderError("The AI provider rate limit was reached.", "rate_limited");
  }

  if (status === 404 || status === 410 || status === 422) {
    return new AIProviderError(
      "The configured AI model is unavailable.",
      "model_unavailable",
    );
  }

  return new AIProviderError("The AI provider is unavailable.", "network_error");
}

function getMessageContent(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("choices" in payload)) {
    return null;
  }

  const choices = (payload as { choices?: unknown }).choices;

  if (!Array.isArray(choices)) {
    return null;
  }

  const first = choices[0];

  if (!first || typeof first !== "object" || !("message" in first)) {
    return null;
  }

  const message = (first as { message?: unknown }).message;

  if (!message || typeof message !== "object" || !("content" in message)) {
    return null;
  }

  const content = (message as { content?: unknown }).content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part || typeof part !== "object" || !("text" in part)) return "";
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      })
      .join("");
  }

  return null;
}

function parseJsonFromModelText(text: string): unknown {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new AIProviderError(
      "The AI provider returned an empty response.",
      "invalid_response",
    );
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1]?.trim() ?? extractJsonObject(trimmed);

  try {
    return JSON.parse(candidate);
  } catch {
    throw new AIProviderError(
      "The AI provider returned invalid JSON.",
      "invalid_response",
    );
  }
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return text;
  }

  return text.slice(start, end + 1);
}
