import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getMySqlDatabase: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ getMySqlDatabase: mocks.getMySqlDatabase }));

import {
  mapMySqlConversation,
  mapMySqlConversationMessage,
  parseMySqlExchangeInput,
  getMySqlConversationThread,
  listMySqlConversations,
  createMySqlConversation,
  appendMySqlConversationExchange,
} from "@/lib/mysql/conversation";
import {
  mapMySqlMistake,
  getMySqlMistakeNotebook,
  getMySqlWeakAreas,
  dismissMySqlMistake,
  syncMySqlMessageCorrections,
} from "@/lib/mysql/mistakes";
import { loadMySqlLearningMemoryCache } from "@/lib/mysql/memory-cache";
import type { conversations, conversationMessages, mistakes } from "@/lib/db/schema";

const userId = "90000000-0000-4000-8000-000000000001";
const conversationId = "90000000-0000-4000-8000-000000000002";
const messageId = "90000000-0000-4000-8000-000000000003";
const otherId = "90000000-0000-4000-8000-000000000004";

const conversation = {
  id: conversationId,
  userId,
  topic: "work",
  feedback: null,
  status: "active",
  activeRequestId: null,
  activeGenerationStartedAt: null,
  endedAt: null,
  messages: [],
  createdAt: "2026-11-06 09:00:00.000",
  updatedAt: "2026-11-06 09:01:00.000",
} as typeof conversations.$inferSelect;

const message = {
  id: messageId,
  conversationId,
  userId,
  role: "assistant",
  content: "How are you?",
  corrections: [],
  requestId: "request-123",
  createdAt: "2026-11-06 09:00:05.500",
} as typeof conversationMessages.$inferSelect;

const mistake = {
  id: otherId,
  userId,
  wrongSentence: "I go yesterday",
  correctSentence: "I went yesterday",
  explanation: "Use past tense",
  category: "grammar",
  sourceMessageId: messageId,
  correctionIndex: 0,
  dismissedAt: null,
  createdAt: "2026-11-06 09:02:05.125",
} as typeof mistakes.$inferSelect;

beforeEach(() => {
  mocks.getMySqlDatabase.mockReset();
});

describe("isolated MySQL conversation, notebook and memory adapters", () => {
  it("maps UTC conversation timestamps and keeps the established UI contract", () => {
    expect(mapMySqlConversation(conversation)).toMatchObject({
      user_id: userId,
      created_at: "2026-11-06T09:00:00.000Z",
      updated_at: "2026-11-06T09:01:00.000Z",
      status: "active",
    });
    expect(mapMySqlConversationMessage(message)).toMatchObject({
      conversation_id: conversationId,
      created_at: "2026-11-06T09:00:05.500Z",
      corrections: [],
    });
  });

  it("rejects corrupt conversation topics and malformed JSON corrections", () => {
    expect(() => mapMySqlConversation({ ...conversation, topic: "admin" } as typeof conversations.$inferSelect)).toThrow();
    expect(() => mapMySqlConversationMessage({ ...message, corrections: { forged: true } } as unknown as typeof conversationMessages.$inferSelect)).toThrow();
  });

  it("accepts only bounded AI exchanges with controlled request identifiers", () => {
    const valid = {
      conversationId, requestId: "request-123", text: "Hello",
      reply: "Hello, how are you?", corrections: [],
    };
    expect(parseMySqlExchangeInput(valid).user.text).toBe("Hello");
    expect(() => parseMySqlExchangeInput({ ...valid, text: "" })).toThrow();
    expect(() => parseMySqlExchangeInput({ ...valid, requestId: "abc" })).toThrow();
    expect(() => parseMySqlExchangeInput({ ...valid, corrections: [{ original: "x" }] })).toThrow();
  });

  it("rejects malformed identities before opening a database connection", async () => {
    await expect(getMySqlConversationThread("user-from-browser", conversationId)).rejects.toThrow();
    await expect(getMySqlConversationThread(userId, "not-a-uuid")).rejects.toThrow();
    await expect(listMySqlConversations("user-from-browser")).rejects.toThrow();
    await expect(createMySqlConversation("user-from-browser", "work")).rejects.toThrow();
    await expect(appendMySqlConversationExchange("user-from-browser", {})).rejects.toThrow();
    await expect(getMySqlMistakeNotebook("user-from-browser")).rejects.toThrow();
    await expect(getMySqlWeakAreas("user-from-browser")).rejects.toThrow();
    await expect(dismissMySqlMistake("user-from-browser", otherId)).rejects.toThrow();
    await expect(syncMySqlMessageCorrections(userId, "not-a-uuid")).rejects.toThrow();
    await expect(loadMySqlLearningMemoryCache("user-from-browser", "UTC")).rejects.toThrow();
    expect(mocks.getMySqlDatabase).not.toHaveBeenCalled();
  });

  it("rejects unsafe conversation page limits and invalid conversation topics", async () => {
    await expect(listMySqlConversations(userId, 0)).rejects.toThrow();
    await expect(listMySqlConversations(userId, 51)).rejects.toThrow();
    await expect(createMySqlConversation(userId, "not-a-topic")).rejects.toThrow();
    expect(mocks.getMySqlDatabase).not.toHaveBeenCalled();
  });

  it("maps owned mistake notebook records without losing dismissal fields", () => {
    expect(mapMySqlMistake(mistake)).toMatchObject({
      wrong_sentence: "I go yesterday",
      created_at: "2026-11-06T09:02:05.125Z",
      dismissed_at: null,
    });
    expect(mapMySqlMistake({ ...mistake, dismissedAt: "2026-11-06 09:02:06.000" })).toMatchObject({
      dismissed_at: "2026-11-06T09:02:06.000Z",
    });
  });

  it("rejects invalid notebook limits and forged dismissal identifiers", async () => {
    await expect(getMySqlWeakAreas(userId, 0)).rejects.toThrow();
    await expect(getMySqlWeakAreas(userId, 21)).rejects.toThrow();
    await expect(dismissMySqlMistake(userId, "not-a-uuid")).rejects.toThrow();
    expect(mocks.getMySqlDatabase).not.toHaveBeenCalled();
  });

  it("returns unavailable when the learning-memory snapshot does not exist", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    mocks.getMySqlDatabase.mockReturnValue({ select: () => ({ from }) });
    expect(await loadMySqlLearningMemoryCache(userId, "UTC")).toEqual({ status: "unavailable" });
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("returns unavailable rather than leaking malformed snapshot transport errors", async () => {
    const limit = vi.fn().mockRejectedValue(new Error("private MySQL details"));
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    mocks.getMySqlDatabase.mockReturnValue({ select: () => ({ from }) });
    expect(await loadMySqlLearningMemoryCache(userId, "UTC")).toEqual({ status: "unavailable" });
  });
});
