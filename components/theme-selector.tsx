"use client";

import { useRef } from "react";
import { updateThemePreference } from "@/lib/actions/profile";
import type { Messages } from "@/lib/i18n/config";
import { isThemePreference } from "@/lib/theme/config";
import { useThemePreference } from "@/components/theme-provider";

type ThemeSelectorProps = {
  messages: Messages;
  persistToProfile: boolean;
};

export function ThemeSelector({
  messages,
  persistToProfile,
}: ThemeSelectorProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const { preference, setPreference } = useThemePreference();

  function handleChange(value: string) {
    if (!isThemePreference(value)) return;

    setPreference(value);

    if (persistToProfile) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form
      ref={formRef}
      action={persistToProfile ? updateThemePreference : undefined}
    >
      <label className="sr-only" htmlFor="theme_preference">
        {messages.common.theme}
      </label>
      <select
        id="theme_preference"
        name="theme_preference"
        value={preference}
        onChange={(event) => handleChange(event.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
      >
        <option value="light">{messages.theme.light}</option>
        <option value="dark">{messages.theme.dark}</option>
        <option value="system">{messages.theme.system}</option>
        <option value="auto">{messages.theme.auto}</option>
      </select>
    </form>
  );
}
