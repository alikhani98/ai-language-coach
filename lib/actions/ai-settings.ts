"use server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { isMySqlPreviewEnabled } from "@/lib/auth/backend-mode";
import { getMySqlDatabase } from "@/lib/db/client";
import { appUsers, userAiSettings, aiSharedKeyPolicy } from "@/lib/db/schema";
import { encryptUserApiKey, fingerprintUserApiKey, lastFourUserApiKey, assertEncryptionConfigured } from "@/lib/ai/user-settings";
import { findCatalogModel, getOpenRouterCatalog } from "@/lib/ai/catalog";
import { buildJsonChatPayload, fetchJsonWithTimeout, parseProviderJsonResponse } from "@/lib/ai/providers/json";
import { dailyLessonContentSchema } from "@/lib/validations/dailyLesson";
import { conversationCoachResponseSchema } from "@/lib/validations/conversation";
import { decryptUserApiKey } from "@/lib/ai/user-settings";

const modelId = z.string().trim().min(1).max(191).regex(/^[a-zA-Z0-9._:/-]+$/);
const saveSchema = z.object({ apiKey: z.string().trim().min(20).max(300).optional(), lessonModel: modelId, conversationModel: modelId, analysisModel: modelId }).strict();
async function activeUser() { if (!isMySqlPreviewEnabled()) throw new Error("AI settings require MySQL mode."); const user = await getCurrentUser(); if (!user) throw new Error("Sign in required."); return user; }
async function approvedModels(values: string[]) { const catalog = await getOpenRouterCatalog(); if (values.some((value) => !findCatalogModel(catalog, value))) throw new Error("Select models from the current catalog."); return catalog; }
export async function getAiSettings() {
  const user = await activeUser();
  const rows = await getMySqlDatabase().select({ provider: userAiSettings.provider, last4: userAiSettings.keyLast4, lessonModel: userAiSettings.lessonModel, conversationModel: userAiSettings.conversationModel, analysisModel: userAiSettings.analysisModel, sourcePreference: userAiSettings.sourcePreference, updatedAt: userAiSettings.updatedAt }).from(userAiSettings).where(eq(userAiSettings.userId, user.id)).limit(1);
  return rows[0] ?? null;
}
export async function saveAiSettings(input: unknown) {
  const user = await activeUser(); const parsed = saveSchema.parse(input); await approvedModels([parsed.lessonModel, parsed.conversationModel, parsed.analysisModel]);
  const db = getMySqlDatabase();
  const current = await db.select({ encryptedApiKey: userAiSettings.encryptedApiKey, keyFingerprint: userAiSettings.keyFingerprint, keyLast4: userAiSettings.keyLast4 }).from(userAiSettings).where(eq(userAiSettings.userId, user.id)).limit(1);
  if (!parsed.apiKey && !current[0]) throw new Error("An API key is required for first-time setup.");
  const key = parsed.apiKey;
  if (key) {
    assertEncryptionConfigured();
    const encryptedApiKey = encryptUserApiKey(key, user.id);
    await db.insert(userAiSettings).values({ userId: user.id, provider: "openrouter", encryptedApiKey, keyFingerprint: fingerprintUserApiKey(key), keyLast4: lastFourUserApiKey(key), lessonModel: parsed.lessonModel, conversationModel: parsed.conversationModel, analysisModel: parsed.analysisModel, sourcePreference: "user" }).onDuplicateKeyUpdate({ set: { encryptedApiKey, keyFingerprint: fingerprintUserApiKey(key), keyLast4: lastFourUserApiKey(key), lessonModel: parsed.lessonModel, conversationModel: parsed.conversationModel, analysisModel: parsed.analysisModel, sourcePreference: "user" } });
  } else {
    await db.update(userAiSettings).set({ lessonModel: parsed.lessonModel, conversationModel: parsed.conversationModel, analysisModel: parsed.analysisModel }).where(eq(userAiSettings.userId, user.id));
  }
  return { saved: true, last4: key ? lastFourUserApiKey(key) : current[0]!.keyLast4 };
}
export async function deleteAiSettings() { const user = await activeUser(); await getMySqlDatabase().delete(userAiSettings).where(eq(userAiSettings.userId, user.id)); return { deleted: true }; }
export async function verifyAiConnection() {
  const user = await activeUser();
  const rows = await getMySqlDatabase().select({ encryptedApiKey: userAiSettings.encryptedApiKey, provider: userAiSettings.provider }).from(userAiSettings).where(eq(userAiSettings.userId, user.id)).limit(1);
  if (!rows[0]) return { ok: false, errorClass: "missing_key" } as const;
  try {
    const response = await fetchJsonWithTimeout("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${decryptUserApiKey(rows[0].encryptedApiKey, user.id, rows[0].provider)}` } }, 10000);
    return response.ok ? { ok: true } as const : { ok: false, errorClass: response.status === 401 ? "invalid_key" : "provider_error" } as const;
  } catch { return { ok: false, errorClass: "network_error" } as const; }
}
export async function testSelectedAiModel(task: "lesson" | "conversation") {
  const user = await activeUser();
  const rows = await getMySqlDatabase().select({ settings: userAiSettings }).from(userAiSettings).where(eq(userAiSettings.userId, user.id)).limit(1);
  const settings = rows[0]?.settings;
  if (!settings) return { ok: false, errorClass: "missing_key" } as const;
  const model = task === "lesson" ? settings.lessonModel : settings.conversationModel;
  try {
    const key = decryptUserApiKey(settings.encryptedApiKey, user.id, settings.provider);
    const response = await fetchJsonWithTimeout("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(buildJsonChatPayload({ temperature: 0, maxTokens: 220, schemaName: task, schemaHint: task === "lesson" ? "daily lesson content" : "conversation coach response", messages: [{ role: "user", content: task === "lesson" ? "Return a short valid lesson." : "Return a short valid conversation response." }] }, model)) }, 15000);
    if (!response.ok) return { ok: false, errorClass: response.status === 401 ? "invalid_key" : response.status === 429 ? "rate_limited" : "provider_error" } as const;
    const payload = parseProviderJsonResponse(await response.json());
    const valid = task === "lesson" ? dailyLessonContentSchema.safeParse(payload).success : conversationCoachResponseSchema.safeParse(payload).success;
    return valid ? { ok: true } as const : { ok: false, errorClass: "invalid_schema" } as const;
  } catch { return { ok: false, errorClass: "test_failed" } as const; }
}
export async function getSharedKeyPolicy() { const user = await activeUser(); const rows = await getMySqlDatabase().select({ role: appUsers.role, enabled: aiSharedKeyPolicy.enabled }).from(appUsers).leftJoin(aiSharedKeyPolicy, eq(aiSharedKeyPolicy.id, "1")).where(eq(appUsers.id, user.id)).limit(1); if (rows[0]?.role !== "admin") throw new Error("Admin access required."); return rows[0]?.enabled === 1; }
export async function setSharedKeyPolicy(enabled: boolean) { const user = await activeUser(); const rows = await getMySqlDatabase().select({ role: appUsers.role }).from(appUsers).where(eq(appUsers.id, user.id)).limit(1); if (rows[0]?.role !== "admin") throw new Error("Admin access required."); await getMySqlDatabase().insert(aiSharedKeyPolicy).values({ id: "1", enabled: enabled ? 1 : 0 }).onDuplicateKeyUpdate({ set: { enabled: enabled ? 1 : 0 } }); return { enabled }; }
