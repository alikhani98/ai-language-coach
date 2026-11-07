import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { decryptUserApiKey, encryptUserApiKey, fingerprintUserApiKey } from "@/lib/ai/user-settings";
import { classifyOpenRouterModels } from "@/lib/ai/catalog";

describe("user AI settings security", () => {
  beforeEach(() => { process.env.ZABAN_AI_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; });
  it("round trips and binds ciphertext to user and provider", () => {
    const encrypted = encryptUserApiKey("sk-or-test-secret", "11111111-1111-4111-8111-111111111111");
    expect(decryptUserApiKey(encrypted, "11111111-1111-4111-8111-111111111111")).toBe("sk-or-test-secret");
    expect(() => decryptUserApiKey(encrypted, "22222222-2222-4222-8222-222222222222")).toThrow();
    expect(encrypted).not.toContain("sk-or-test-secret");
    expect(fingerprintUserApiKey("sk-or-test-secret")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("rejects tampering", () => {
    const encrypted = encryptUserApiKey("sk-or-test-secret", "11111111-1111-4111-8111-111111111111");
    expect(() => decryptUserApiKey(`${encrypted}x`, "11111111-1111-4111-8111-111111111111")).toThrow();
  });
});

describe("OpenRouter model classification", () => {
  it("marks only explicit :free variants as free", () => {
    const models = classifyOpenRouterModels({ data: [
      { id: "vendor/paid", name: "Paid", architecture: { modality: "text->text" }, pricing: { prompt: "0", completion: "0" } },
      { id: "vendor/free:free", name: "Free", architecture: { modality: "text->text" } },
      { id: "vendor/embedding", name: "Embedding", architecture: { modality: "text->embedding" } },
    ] });
    expect(models.find((model) => model.id === "vendor/paid")?.free).toBe(false);
    expect(models.find((model) => model.id === "vendor/free:free")?.free).toBe(true);
    expect(models.some((model) => model.id.includes("embedding"))).toBe(false);
  });
});
