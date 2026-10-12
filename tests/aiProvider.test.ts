import { afterEach, describe, expect, it, vi } from "vitest";
import { getConversationCoachReply } from "@/lib/ai/conversationCoach";
import { generateDailyLesson } from "@/lib/ai/dailyCoach";
import { analyzeMistake } from "@/lib/ai/mistakeAnalyzer";
import {
  createAIProvider,
  resolveAIProviderConfig,
  setAIProviderForTesting,
  type AIProvider,
} from "@/lib/ai/provider";
import { AIProviderError } from "@/lib/ai/providers/json";

const validDailyLesson = {
  words: [
    {
      word: "prepare",
      meaning: "to make something ready",
      example: "I prepare my notes before the meeting.",
    },
    {
      word: "clear",
      meaning: "easy to understand",
      example: "Her explanation was clear.",
    },
    {
      word: "steady",
      meaning: "regular and controlled",
      example: "A steady habit helps you improve.",
    },
  ],
  sentence: "I would like to explain my idea clearly.",
  reading:
    "Mina practices English for a short time every morning. She reads one small paragraph, learns a few useful words, and says one sentence aloud. The routine is simple, so she can repeat it even on busy days.",
  speakingTask:
    "Speak aloud for one minute about one small plan you have for today.",
};

function mockProvider(overrides: Partial<AIProvider>): AIProvider {
  return {
    generateDailyLesson: vi.fn(async () => validDailyLesson),
    generateConversationResponse: vi.fn(async () => ({
      reply: "That sounds useful. What will you do next?",
      corrections: [],
    })),
    analyzeMistake: vi.fn(async () => ({
      correctSentence: "I went yesterday.",
      explanation: "Use past tense for a completed past action.",
      category: "grammar",
    })),
    ...overrides,
  };
}

function mockOpenRouterResponse(content: string, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content,
              },
            },
          ],
        }),
        { status },
      ),
    ),
  );
}

afterEach(() => {
  setAIProviderForTesting(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AI provider architecture", () => {
  it("selects the configured provider without requiring provider-specific SDK settings", () => {
    const openRouterConfig = resolveAIProviderConfig({
      AI_PROVIDER: "openrouter",
      OPENROUTER_API_KEY: "test-key",
      AI_MODEL: "provider/model",
    });
    const localConfig = resolveAIProviderConfig({
      AI_PROVIDER: "local",
      AI_MODEL: "local-model",
      LOCAL_AI_BASE_URL: "http://localhost:11434/v1",
    });
    const blankOptionalConfig = resolveAIProviderConfig({
      AI_PROVIDER: "openrouter",
      OPENROUTER_API_KEY: "",
      AI_MODEL: "",
      AI_BASE_URL: "",
    });

    expect(openRouterConfig.provider).toBe("openrouter");
    expect(localConfig.provider).toBe("local");
    expect(blankOptionalConfig.model).toBeUndefined();
    expect(blankOptionalConfig.openRouterApiKey).toBeUndefined();
    expect(createAIProvider(openRouterConfig).generateDailyLesson).toEqual(
      expect.any(Function),
    );
    expect(createAIProvider(localConfig).generateConversationResponse).toEqual(
      expect.any(Function),
    );
  });

  it("parses OpenRouter JSON responses into normalized provider output", async () => {
    mockOpenRouterResponse(
      '```json\n{"reply":"Nice answer. What happened next?","corrections":[]}\n```',
    );
    const provider = createAIProvider({
      provider: "openrouter",
      openRouterApiKey: "test-key",
      model: "provider/model",
      timeoutMs: 5000,
    });

    await expect(
      provider.generateConversationResponse({
        messages: [{ role: "user", content: "Hello" }],
        schemaName: "conversation_coach_response",
        schemaHint: "{}",
        temperature: 0.2,
        maxTokens: 200,
      }),
    ).resolves.toEqual({
      reply: "Nice answer. What happened next?",
      corrections: [],
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });

  it("rejects invalid JSON from the provider before validation", async () => {
    mockOpenRouterResponse("This is not JSON.");
    const provider = createAIProvider({
      provider: "openrouter",
      openRouterApiKey: "test-key",
      model: "provider/model",
      timeoutMs: 5000,
    });

    await expect(
      provider.generateDailyLesson({
        messages: [{ role: "user", content: "Create a lesson" }],
        schemaName: "daily_language_lesson",
        schemaHint: "{}",
        temperature: 0.2,
        maxTokens: 200,
      }),
    ).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("fails safely when the provider API key is missing", async () => {
    const provider = createAIProvider({
      provider: "openrouter",
      model: "provider/model",
      timeoutMs: 5000,
    });

    await expect(
      provider.generateDailyLesson({
        messages: [{ role: "user", content: "Create a lesson" }],
        schemaName: "daily_language_lesson",
        schemaHint: "{}",
        temperature: 0.2,
        maxTokens: 200,
      }),
    ).rejects.toMatchObject({
      code: "missing_config",
    });
  });

  it("maps unavailable models to a safe provider error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "invalid model" }), { status: 422 }),
      ),
    );
    const provider = createAIProvider({
      provider: "openrouter",
      openRouterApiKey: "test-key",
      model: "invalid/model",
      timeoutMs: 5000,
    });

    await expect(
      provider.generateConversationResponse({
        messages: [{ role: "user", content: "Hello" }],
        schemaName: "conversation_coach_response",
        schemaHint: "{}",
        temperature: 0.2,
        maxTokens: 200,
      }),
    ).rejects.toMatchObject({
      code: "model_unavailable",
    });
  });

  it("rejects provider output that fails Zod validation", async () => {
    setAIProviderForTesting(
      mockProvider({
        generateDailyLesson: vi.fn(async () => ({
          words: [],
          sentence: "Too short",
          reading: "Too short",
          speakingTask: "Too short",
        })),
      }),
    );

    await expect(
      generateDailyLesson({
        userProfile: {
          level: "B1 Intermediate",
          goal: "Work",
          dailyMinutes: 15,
          timezone: "Asia/Tehran",
          interfaceLanguage: "en",
        },
        history: {
          previousMistakes: [],
          previousTopics: [],
        },
      }),
    ).rejects.toThrow();
  });

  it("handles provider timeouts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string | URL | Request, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      ),
    );
    const provider = createAIProvider({
      provider: "openrouter",
      openRouterApiKey: "test-key",
      model: "provider/model",
      timeoutMs: 1,
    });

    await expect(
      provider.generateConversationResponse({
        messages: [{ role: "user", content: "Hello" }],
        schemaName: "conversation_coach_response",
        schemaHint: "{}",
        temperature: 0.2,
        maxTokens: 200,
      }),
    ).rejects.toBeInstanceOf(AIProviderError);
  });

  it("handles unavailable provider responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "down" }), { status: 503 })),
    );
    const provider = createAIProvider({
      provider: "openrouter",
      openRouterApiKey: "test-key",
      model: "provider/model",
      timeoutMs: 5000,
    });

    await expect(
      provider.generateDailyLesson({
        messages: [{ role: "user", content: "Create a lesson" }],
        schemaName: "daily_language_lesson",
        schemaHint: "{}",
        temperature: 0.2,
        maxTokens: 200,
      }),
    ).rejects.toMatchObject({
      code: "network_error",
    });
  });

  it("generates conversation replies using a mocked provider", async () => {
    const provider = mockProvider({});
    setAIProviderForTesting(provider);

    await expect(
      getConversationCoachReply({
        profile: {
          level: "B1 Intermediate",
          goal: "Conversation",
          interfaceLanguage: "fa",
        },
        topic: "daily_life",
        recentMessages: [],
        userMessage: "I go yesterday.",
      }),
    ).resolves.toEqual({
      reply: "That sounds useful. What will you do next?",
      corrections: [],
    });
    expect(provider.generateConversationResponse).toHaveBeenCalledOnce();
    expect(provider.generateConversationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining("Interface language: fa"),
          }),
        ]),
      }),
    );
  });

  it("generates daily lessons using a mocked provider", async () => {
    const provider = mockProvider({});
    setAIProviderForTesting(provider);

    await expect(
      generateDailyLesson({
        userProfile: {
          level: "B1 Intermediate",
          goal: "Work",
          dailyMinutes: 15,
          timezone: "Asia/Tehran",
          interfaceLanguage: "en",
        },
        history: {
          previousMistakes: ["I go yesterday"],
          previousTopics: ["meetings"],
        },
      }),
    ).resolves.toEqual(validDailyLesson);
    expect(provider.generateDailyLesson).toHaveBeenCalledOnce();
  });

  it("analyzes mistakes using a mocked provider", async () => {
    const provider = mockProvider({});
    setAIProviderForTesting(provider);

    await expect(
      analyzeMistake({
        sentence: "I go yesterday.",
        context: "Past weekend conversation",
        interfaceLanguage: "fa",
      }),
    ).resolves.toEqual({
      correctSentence: "I went yesterday.",
      explanation: "Use past tense for a completed past action.",
      category: "grammar",
    });
    expect(provider.analyzeMistake).toHaveBeenCalledOnce();
  });
});
