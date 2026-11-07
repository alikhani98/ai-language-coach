"use server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { isMySqlPreviewEnabled } from "@/lib/auth/backend-mode";
import { getMySqlDatabase } from "@/lib/db/client";
import { appUsers, userAiSettings, aiSharedKeyPolicy } from "@/lib/db/schema";
import { encryptUserApiKey, fingerprintUserApiKey, lastFourUserApiKey, assertEncryptionConfigured } from "@/lib/ai/user-settings";
import { findCatalogModel, getOpenRouterCatalog } from "@/lib/ai/catalog";

const modelId = z.string().trim().min(1).max(191).regex(/^[a-zA-Z0-9._:/-]+$/);
const saveSchema = z.object({ apiKey: z.string().trim().min(20).max(300), lessonModel: modelId, conversationModel: modelId, analysisModel: modelId }).strict();
async function activeUser() { if (!isMySqlPreviewEnabled()) throw new Error("AI settings require MySQL mode."); const user = await getCurrentUser(); if (!user) throw new Error("Sign in required."); return user; }
async function approvedModels(values: string[]) { const catalog = await getOpenRouterCatalog(); if (values.some((value) => !findCatalogModel(catalog, value))) throw new Error("Select models from the current catalog."); return catalog; }
export async function getAiSettings() {
  const user = await activeUser();
  const rows = await getMySqlDatabase().select({ provider: userAiSettings.provider, last4: userAiSettings.keyLast4, lessonModel: userAiSettings.lessonModel, conversationModel: userAiSettings.conversationModel, analysisModel: userAiSettings.analysisModel, updatedAt: userAiSettings.updatedAt }).from(userAiSettings).where(eq(userAiSettings.userId, user.id)).limit(1);
  return rows[0] ?? null;
}
export async function saveAiSettings(input: unknown) {
  const user = await activeUser(); const parsed = saveSchema.parse(input); assertEncryptionConfigured(); await approvedModels([parsed.lessonModel, parsed.conversationModel, parsed.analysisModel]);
  const db = getMySqlDatabase(); const encryptedApiKey = encryptUserApiKey(parsed.apiKey, user.id);
  await db.insert(userAiSettings).values({ userId: user.id, provider: "openrouter", encryptedApiKey, keyFingerprint: fingerprintUserApiKey(parsed.apiKey), keyLast4: lastFourUserApiKey(parsed.apiKey), lessonModel: parsed.lessonModel, conversationModel: parsed.conversationModel, analysisModel: parsed.analysisModel, sourcePreference: "user" }).onDuplicateKeyUpdate({ set: { encryptedApiKey, keyFingerprint: fingerprintUserApiKey(parsed.apiKey), keyLast4: lastFourUserApiKey(parsed.apiKey), lessonModel: parsed.lessonModel, conversationModel: parsed.conversationModel, analysisModel: parsed.analysisModel, sourcePreference: "user" } });
  return { saved: true, last4: lastFourUserApiKey(parsed.apiKey) };
}
export async function deleteAiSettings() { const user = await activeUser(); await getMySqlDatabase().delete(userAiSettings).where(eq(userAiSettings.userId, user.id)); return { deleted: true }; }
export async function getSharedKeyPolicy() { const user = await activeUser(); const rows = await getMySqlDatabase().select({ role: appUsers.role, enabled: aiSharedKeyPolicy.enabled }).from(appUsers).leftJoin(aiSharedKeyPolicy, eq(aiSharedKeyPolicy.id, "1")).where(eq(appUsers.id, user.id)).limit(1); if (rows[0]?.role !== "admin") throw new Error("Admin access required."); return rows[0]?.enabled === 1; }
export async function setSharedKeyPolicy(enabled: boolean) { const user = await activeUser(); const rows = await getMySqlDatabase().select({ role: appUsers.role }).from(appUsers).where(eq(appUsers.id, user.id)).limit(1); if (rows[0]?.role !== "admin") throw new Error("Admin access required."); await getMySqlDatabase().insert(aiSharedKeyPolicy).values({ id: "1", enabled: enabled ? 1 : 0 }).onDuplicateKeyUpdate({ set: { enabled: enabled ? 1 : 0 } }); return { enabled }; }
