export const themePreferences = ["light", "dark", "system", "auto"] as const;

export type ThemePreference = (typeof themePreferences)[number];
export type EffectiveTheme = "light" | "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    value === "light" ||
    value === "dark" ||
    value === "system" ||
    value === "auto"
  );
}

export function resolveThemePreference(value?: string | null): ThemePreference {
  return isThemePreference(value) ? value : "system";
}

export function getAutoTheme(date = new Date()): EffectiveTheme {
  const hour = date.getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

export function getEffectiveTheme({
  preference,
  systemDark,
  date = new Date(),
}: {
  preference: ThemePreference;
  systemDark: boolean;
  date?: Date;
}): EffectiveTheme {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  if (preference === "auto") {
    return getAutoTheme(date);
  }

  return systemDark ? "dark" : "light";
}
