import enMessages from "@/lib/i18n/messages/en.json";
import faMessages from "@/lib/i18n/messages/fa.json";

export const interfaceLanguages = ["en", "fa"] as const;
export type InterfaceLanguage = (typeof interfaceLanguages)[number];

export type Messages = typeof enMessages;

const messages: Record<InterfaceLanguage, Messages> = {
  en: enMessages,
  fa: faMessages,
};

export function isInterfaceLanguage(value: unknown): value is InterfaceLanguage {
  return value === "en" || value === "fa";
}

export function getMessages(language?: string | null): Messages {
  return messages[isInterfaceLanguage(language) ? language : "en"];
}

export function resolveInterfaceLanguage(profile?: {
  interface_language?: string | null;
} | null): InterfaceLanguage {
  return isInterfaceLanguage(profile?.interface_language)
    ? profile.interface_language
    : "en";
}

export function getTextDirection(language?: string | null) {
  return language === "fa" ? "rtl" : "ltr";
}

export function formatMessage(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
