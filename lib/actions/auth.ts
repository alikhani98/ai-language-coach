"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validations/auth";
import { isMySqlPreviewEnabled } from "@/lib/auth/backend-mode";

export type AuthActionState = {
  error?: string;
};

function getAuthInput(formData: FormData) {
  return authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function login(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = getAuthInput(formData);

  if (!parsed.success) {
    return {
      error: "authFailed",
    };
  }

  if (isMySqlPreviewEnabled()) return { error: "authFailed" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "authFailed" };
  }

  redirect("/dashboard");
}

export async function signup(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = getAuthInput(formData);

  if (!parsed.success) {
    return {
      error: "signupFailed",
    };
  }

  if (isMySqlPreviewEnabled()) return { error: "registrationUnavailable" };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    return { error: "signupFailed" };
  }

  if (data.session) {
    redirect("/approval-pending");
  }

  return { error: "registrationUnavailable" };
}

export async function logout() {
  if (isMySqlPreviewEnabled()) throw new Error("Use Better Auth sign-out endpoint in preview.");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
