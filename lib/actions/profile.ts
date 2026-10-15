"use server";

import { accountDestination, type AccountStatus } from "@/lib/admin/model";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/user";
import {
  interfaceLanguageSchema,
  profileSchema,
  themePreferenceSchema,
  type ProfileInput,
} from "@/lib/validations/profile";
import { isProfileComplete } from "@/lib/daily/lesson";
import type { InterfaceLanguage } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/config";
import type { ThemePreference } from "@/lib/theme/config";

export type ProfileActionState = {
  error?: string;
};

export type UserProfile = {
  id: string;
  user_id: string;
  level: ProfileInput["level"];
  goal: ProfileInput["goal"];
  daily_minutes: number;
  timezone: string;
  interface_language: InterfaceLanguage;
  theme_preference: ThemePreference;
  created_at: string;
  status?: AccountStatus;
};

function parseProfileForm(formData: FormData) {
  return profileSchema.safeParse({
    level: formData.get("level"),
    goal: formData.get("goal"),
    daily_minutes: formData.get("daily_minutes"),
    timezone: formData.get("timezone") || "UTC",
    interface_language: formData.get("interface_language") || "en",
    theme_preference: formData.get("theme_preference") || "system",
  });
}

export async function getProfile(): Promise<UserProfile | null> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users_profile")
    .select("id,user_id,level,goal,daily_minutes,timezone,interface_language,theme_preference,created_at,status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load account preferences.");
  }

  return data as UserProfile | null;
}

export async function requireProfile(): Promise<UserProfile> {
  const profile = await getProfile();

  const destination = accountDestination(profile?.status);
  if (destination) redirect(destination);

  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  return profile as UserProfile;
}

export async function createProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser();
  const parsed = parseProfileForm(formData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? getMessages("en").actions.profileInvalid,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("users_profile").update({
    level: parsed.data.level,
    goal: parsed.data.goal,
    daily_minutes: parsed.data.daily_minutes,
    timezone: parsed.data.timezone,
    interface_language: parsed.data.interface_language,
    theme_preference: parsed.data.theme_preference,
  }).eq("user_id", user.id);

  if (error) {
    return { error: getMessages(parsed.data.interface_language).actions.profileInvalid };
  }

  redirect("/dashboard");
}

export async function updateProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser();
  const parsed = parseProfileForm(formData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? getMessages("en").actions.profileInvalid,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users_profile")
    .update({
      level: parsed.data.level,
      goal: parsed.data.goal,
      daily_minutes: parsed.data.daily_minutes,
      timezone: parsed.data.timezone,
      interface_language: parsed.data.interface_language,
      theme_preference: parsed.data.theme_preference,
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: getMessages(parsed.data.interface_language).actions.profileInvalid };
  }

  redirect("/dashboard");
}

export async function updateInterfaceLanguage(formData: FormData) {
  const user = await requireUser();
  const parsed = interfaceLanguageSchema.safeParse(
    formData.get("interface_language"),
  );

  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("users_profile")
    .update({ interface_language: parsed.data })
    .eq("user_id", user.id);

  revalidatePath("/", "layout");
}

export async function updateThemePreference(formData: FormData) {
  const user = await requireUser();
  const parsed = themePreferenceSchema.safeParse(
    formData.get("theme_preference"),
  );

  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("users_profile")
    .update({ theme_preference: parsed.data })
    .eq("user_id", user.id);

  revalidatePath("/", "layout");
}
