"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/user";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";
import { isProfileComplete } from "@/lib/daily/lesson";

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
  created_at: string;
};

function parseProfileForm(formData: FormData) {
  return profileSchema.safeParse({
    level: formData.get("level"),
    goal: formData.get("goal"),
    daily_minutes: formData.get("daily_minutes"),
    timezone: formData.get("timezone") || "UTC",
  });
}

export async function getProfile(): Promise<UserProfile | null> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users_profile")
    .select("id,user_id,level,goal,daily_minutes,timezone,created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserProfile | null;
}

export async function requireProfile(): Promise<UserProfile> {
  const profile = await getProfile();

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
      error: parsed.error.issues[0]?.message ?? "Check your preferences.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("users_profile").insert({
    user_id: user.id,
    level: parsed.data.level,
    goal: parsed.data.goal,
    daily_minutes: parsed.data.daily_minutes,
    timezone: parsed.data.timezone,
  });

  if (error) {
    return { error: error.message };
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
      error: parsed.error.issues[0]?.message ?? "Check your preferences.",
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
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
