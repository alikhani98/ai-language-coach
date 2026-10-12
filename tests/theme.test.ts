import { describe, expect, it } from "vitest";
import {
  getAutoTheme,
  getEffectiveTheme,
  isThemePreference,
  resolveThemePreference,
} from "@/lib/theme/config";
import { profileSchema } from "@/lib/validations/profile";

describe("theme preferences", () => {
  it("defaults profile theme to system", () => {
    const profile = profileSchema.parse({
      level: "b1_intermediate",
      goal: "conversation",
      daily_minutes: 15,
      timezone: "Asia/Tehran",
      interface_language: "en",
    });

    expect(profile.theme_preference).toBe("system");
  });

  it("accepts the supported theme options", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("auto")).toBe(true);
    expect(isThemePreference("midnight")).toBe(false);
  });

  it("resolves dark and light selections directly", () => {
    expect(
      getEffectiveTheme({ preference: "dark", systemDark: false }),
    ).toBe("dark");
    expect(
      getEffectiveTheme({ preference: "light", systemDark: true }),
    ).toBe("light");
  });

  it("follows OS preference for system selection", () => {
    expect(
      getEffectiveTheme({ preference: "system", systemDark: true }),
    ).toBe("dark");
    expect(
      getEffectiveTheme({ preference: "system", systemDark: false }),
    ).toBe("light");
  });

  it("uses local browser time for auto mode", () => {
    expect(getAutoTheme(new Date("2026-10-12T05:59:00"))).toBe("dark");
    expect(getAutoTheme(new Date("2026-10-12T06:00:00"))).toBe("light");
    expect(getAutoTheme(new Date("2026-10-12T17:59:00"))).toBe("light");
    expect(getAutoTheme(new Date("2026-10-12T18:00:00"))).toBe("dark");
  });

  it("falls back to system for missing or invalid persisted values", () => {
    expect(resolveThemePreference(null)).toBe("system");
    expect(resolveThemePreference("unknown")).toBe("system");
    expect(resolveThemePreference("auto")).toBe("auto");
  });

  it("rejects unsupported theme persistence values", () => {
    expect(
      profileSchema.safeParse({
        level: "b1_intermediate",
        goal: "conversation",
        daily_minutes: 15,
        timezone: "Asia/Tehran",
        interface_language: "en",
        theme_preference: "dark",
      }).success,
    ).toBe(true);

    expect(
      profileSchema.safeParse({
        level: "b1_intermediate",
        goal: "conversation",
        daily_minutes: 15,
        timezone: "Asia/Tehran",
        interface_language: "en",
        theme_preference: "neon",
      }).success,
    ).toBe(false);
  });
});
