import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { getProfile } from "@/lib/actions/profile";
import { getAiSettings, getSharedKeyPolicy } from "@/lib/actions/ai-settings";
import { getOpenRouterCatalog } from "@/lib/ai/catalog";
import { resolveInterfaceLanguage, getMessages } from "@/lib/i18n/config";
import { AISettingsForm } from "@/components/ai-settings-form";
import type { AIModel } from "@/lib/ai/catalog";

export default async function AISettingsPage() {
  const user = await getCurrentUser();
  const profile = user ? await getProfile() : null;
  if (!user || !profile || profile.status !== "active") redirect("/login");
  const language = resolveInterfaceLanguage(profile);
  const messages = getMessages(language);
  let models: AIModel[] = [];
  let catalogError = false;
  try { models = await getOpenRouterCatalog(); } catch { catalogError = true; }
  const settings = await getAiSettings();
  const isAdmin = user.app_metadata?.role === "admin";
  const sharedEnabled = isAdmin ? await getSharedKeyPolicy().catch(() => false) : false;
  return <AISettingsForm language={language} messages={messages} models={models} settings={settings} catalogError={catalogError} isAdmin={isAdmin} sharedEnabled={sharedEnabled} />;
}
