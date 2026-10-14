import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLearnerContext, compactConversation } from "@/lib/learner/context";
import { buildPrompt } from "@/lib/ai/prompts/lesson";
import { buildCoachPrompt } from "@/lib/ai/prompts/conversation";
import { generateProgressSummary } from "@/lib/ai/progressCoach";
import { createAIProvider, resolveAIProviderConfig, setAIProviderForTesting } from "@/lib/ai/provider";
import { AIProviderError, withAIRetry } from "@/lib/ai/providers/json";
import { fallbackProgressSummary, parseStoredSummary } from "@/lib/learner/summary";
import { learnerFocus } from "@/lib/learner/focus";
import { getMessages } from "@/lib/i18n/config";

const profile = { level: "a2_elementary", goal: "conversation", daily_minutes: 15, interface_language: "en" };
const pastMistake = {
  wrong_sentence: "I go yesterday", correct_sentence: "I went yesterday",
  explanation: "Use the past tense for a completed action.", category: "grammar",
};
const context = buildLearnerContext(profile, {
  mistakes: [pastMistake, pastMistake, { ...pastMistake, category: "vocabulary" }],
  lessons: [{ date: "2026-10-13", sentence: "I visited a friend.", completed: true }],
  conversations: [{ topic: "travel", feedback: "Practiced travel questions", status: "ended" }],
});
const request = { messages: [], schemaName: "test", schemaHint: "{}", temperature: 0.2, maxTokens: 200 };

afterEach(() => {
  setAIProviderForTesting(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("learner intelligence", () => {
  it("derives ranked weaknesses, vocabulary and recent progress from existing history", () => {
    expect(context.weakAreas).toEqual(["past_simple", "vocabulary"]);
    expect(context.vocabularyWeaknesses).toEqual(["I went yesterday"]);
    expect(context.recentProgress).toEqual({ completedLessons: 1, endedConversations: 1 });
    expect(context.level).toBe(profile.level);
    expect(context.goal).toBe(profile.goal);
    expect(buildLearnerContext(profile).weakAreas).toEqual([]);
    const articleContext = buildLearnerContext(profile, { mistakes: [{
      wrong_sentence: "I went to store yesterday", correct_sentence: "I went to the store yesterday",
      explanation: "Use the definite article.", category: "grammar",
    }] });
    expect(articleContext.weakAreas).toEqual(["grammar"]);
  });

  it("bounds historical records and text even when the source is large", () => {
    const large = buildLearnerContext(profile, {
      mistakes: Array.from({ length: 100 }, () => ({ ...pastMistake, explanation: "x".repeat(10000) })),
      lessons: Array.from({ length: 100 }, () => ({ date: "2026-10-13", sentence: "x".repeat(10000), completed: true })),
    });
    expect(large.recentMistakes).toHaveLength(8);
    expect(large.recentMistakes[0].explanation.length).toBe(240);
    expect(large.recentLessons).toHaveLength(5);
    expect(JSON.stringify(large).length).toBeLessThan(6000);
  });

  it("injects mistakes, previous lesson, goal and correction exercises into daily prompts", () => {
    const prompt = buildPrompt({ learnerContext: context,
      userProfile: { level: profile.level, goal: profile.goal, dailyMinutes: 15, timezone: "UTC", interfaceLanguage: "en" },
      history: { previousMistakes: [], previousTopics: [] },
    });
    expect(prompt).toContain("past_simple");
    expect(prompt).toContain("I visited a friend.");
    expect(prompt).toContain("I went yesterday");
    expect(prompt).toContain("correction exercise");
  });

  it("retains earlier learner facts and recent turns within a fixed history budget", () => {
    const messages = Array.from({ length: 60 }, (_, index) => ({
      role: index % 2 ? "assistant" as const : "user" as const,
      content: `${index === 0 ? "I work at a hospital" : `Turn ${index}`} ${"x".repeat(2000)}`,
    }));
    const memory = compactConversation(messages);
    expect(memory.earlierSummary).toContain("I work at a hospital");
    expect(memory.earlierSummary.length).toBeLessThanOrEqual(900);
    expect(memory.recentMessages).toHaveLength(8);
    expect(memory.recentMessages.every((item) => item.content.length <= 500)).toBe(true);
    const prompt = buildCoachPrompt({ learnerContext: context, profile: { level: "A2", goal: "speaking confidence", interfaceLanguage: "fa" },
      topic: "work", recentMessages: messages, userMessage: "I go yesterday",
    });
    expect(prompt).toContain("I work at a hospital");
    expect(prompt).toContain("past_simple");
    expect(prompt).toContain("I visited a friend.");
    expect(prompt).toContain("Persian");
    expect(prompt.length).toBeLessThan(11000);
  });

  it("localizes focus and fallback evidence without claiming measured improvement", () => {
    expect(learnerFocus(context, getMessages("en"))).toContain("past tense");
    expect(learnerFocus(context, getMessages("fa"))).toContain("زمان گذشته");
    const summary = fallbackProgressSummary({ activity: "lesson", words: ["visit", "went", "friend"], exchanges: 0, corrections: [] }, "en");
    expect(summary.vocabulary).toContain("3");
    expect(summary.speaking).toContain("not assessed");
    expect(parseStoredSummary(JSON.stringify(summary))).toEqual(summary);
    expect(parseStoredSummary("legacy feedback")).toBeUndefined();
    expect(parseStoredSummary('{"speaking":"hello"}')).toBeUndefined();
  });

  it.each(["failure", "invalid output"])("returns a localized summary on %s", async (mode) => {
    setAIProviderForTesting({
      generateDailyLesson: vi.fn(), generateConversationResponse: vi.fn(),
      analyzeMistake: vi.fn(async () => {
        if (mode === "failure") throw new AIProviderError("timeout", "timeout");
        return { grammar: "Incomplete response" };
      }),
    });
    const summary = await generateProgressSummary({ ...context, interfaceLanguage: "fa" }, {
      activity: "conversation", words: [], exchanges: 2, corrections: [pastMistake].map((item) => ({ original: item.wrong_sentence, corrected: item.correct_sentence, explanation: item.explanation })),
    });
    expect(summary.speaking).toContain("2");
    expect(summary.grammar).toContain("اصلاح");
  });

  it.each(["openrouter", "local"] as const)("routes %s tasks and falls back to AI_MODEL", async (providerName) => {
    const bodies: { model: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init: RequestInit) => {
      bodies.push(JSON.parse(init.body as string));
      return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }));
    }));
    const provider = createAIProvider(resolveAIProviderConfig({
      AI_PROVIDER: providerName, OPENROUTER_API_KEY: "test", LOCAL_AI_BASE_URL: "http://localhost:11434/v1",
      AI_MODEL: "default-model", AI_LESSON_MODEL: "lesson-model", AI_CONVERSATION_MODEL: "chat-model",
    }));
    await provider.generateDailyLesson(request);
    await provider.generateConversationResponse(request);
    await provider.analyzeMistake(request);
    expect(bodies.map((body) => body.model)).toEqual(["lesson-model", "chat-model", "default-model"]);
  });

  it("retries a transient failure once and never retries configuration failures", async () => {
    const transient = vi.fn().mockRejectedValueOnce(new AIProviderError("down", "network_error")).mockResolvedValue("recovered");
    await expect(withAIRetry(transient)).resolves.toBe("recovered");
    expect(transient).toHaveBeenCalledTimes(2);
    const missing = vi.fn().mockRejectedValue(new AIProviderError("missing", "missing_config"));
    await expect(withAIRetry(missing)).rejects.toMatchObject({ code: "missing_config" });
    expect(missing).toHaveBeenCalledTimes(1);
    const persistent = vi.fn().mockRejectedValue(new AIProviderError("down", "network_error"));
    await expect(withAIRetry(persistent)).rejects.toMatchObject({ code: "network_error" });
    expect(persistent).toHaveBeenCalledTimes(2);
  });

  it("times out while consuming a stalled response body", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url, init: RequestInit) => {
      const stream = new ReadableStream({
        start(controller) {
          init.signal?.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")));
        },
      });
      return new Response(stream);
    }));
    const provider = createAIProvider({ provider: "local", model: "test", localBaseUrl: "http://localhost/v1", timeoutMs: 5 });
    await expect(provider.generateDailyLesson(request)).rejects.toMatchObject({ code: "timeout" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
