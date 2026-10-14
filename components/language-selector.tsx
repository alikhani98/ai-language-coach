"use client";

import { useRef } from "react";
import { updateInterfaceLanguage } from "@/lib/actions/profile";
import type { InterfaceLanguage } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/config";

type LanguageSelectorProps = {
  currentLanguage: InterfaceLanguage;
  messages: Messages;
};

export function LanguageSelector({
  currentLanguage,
  messages,
}: LanguageSelectorProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateInterfaceLanguage}>
      <label className="sr-only" htmlFor="interface_language">
        {messages.common.language}
      </label>
      <select
        id="interface_language"
        name="interface_language"
        defaultValue={currentLanguage}
        onChange={() => formRef.current?.requestSubmit()}
        className="preference-select w-full"
      >
        <option value="en">{messages.common.english} 🇺🇸</option>
        <option value="fa">{messages.common.persian} 🇮🇷</option>
      </select>
    </form>
  );
}
