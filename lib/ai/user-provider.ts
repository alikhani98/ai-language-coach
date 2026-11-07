import "server-only";
import { and, eq } from "drizzle-orm";
import { getMySqlDatabase } from "@/lib/db/client";
import { appUsers, usersProfile, userAiSettings, aiSharedKeyPolicy } from "@/lib/db/schema";
import { decryptUserApiKey } from "@/lib/ai/user-settings";
import { createAIProvider, resolveAIProviderConfig, type AIProvider } from "@/lib/ai/provider";

export type UserAITask = "lesson" | "conversation" | "analysis";
export async function getUserAIProvider(appUserId: string, task: UserAITask): Promise<AIProvider> {
  const rows = await getMySqlDatabase().select({
    settings: userAiSettings,
    sharedEnabled: aiSharedKeyPolicy.enabled,
  }).from(appUsers).innerJoin(usersProfile, eq(usersProfile.userId, appUsers.id))
    .leftJoin(userAiSettings, eq(userAiSettings.userId, appUsers.id))
    .leftJoin(aiSharedKeyPolicy, eq(aiSharedKeyPolicy.id, "1"))
    .where(and(eq(appUsers.id, appUserId), eq(appUsers.authProvider, "better_auth"), eq(usersProfile.status, "active"))).limit(1);
  const row = rows[0];
  if (!row) throw new Error("Active AI identity is unavailable.");
  const settings = row.settings;
  if (!settings) {
    if (row.sharedEnabled !== 1 || !process.env.OPENROUTER_API_KEY) throw new Error("Add your OpenRouter API key in AI settings.");
    return createAIProvider({ ...resolveAIProviderConfig(), provider: "openrouter", openRouterApiKey: process.env.OPENROUTER_API_KEY });
  }
  const model = task === "lesson" ? settings.lessonModel : task === "conversation" ? settings.conversationModel : settings.analysisModel;
  return createAIProvider({ provider: "openrouter", openRouterApiKey: decryptUserApiKey(settings.encryptedApiKey, appUserId, settings.provider), model, lessonModel: model, conversationModel: model, analysisModel: model, timeoutMs: 20000 });
}
