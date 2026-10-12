import { describe, expect, it } from "vitest";
import {
  formatMessage,
  getMessages,
  getTextDirection,
  isInterfaceLanguage,
  resolveInterfaceLanguage,
} from "@/lib/i18n/config";
import { profileSchema } from "@/lib/validations/profile";

describe("interface language support", () => {
  it("defaults profile interface language to English", () => {
    const profile = profileSchema.parse({
      level: "b1_intermediate",
      goal: "conversation",
      daily_minutes: 15,
      timezone: "Asia/Tehran",
    });

    expect(profile.interface_language).toBe("en");
  });

  it("accepts Persian and English language selections", () => {
    expect(isInterfaceLanguage("fa")).toBe(true);
    expect(isInterfaceLanguage("en")).toBe(true);
    expect(isInterfaceLanguage("de")).toBe(false);
  });

  it("persists only validated language values in profile input", () => {
    const parsed = profileSchema.safeParse({
      level: "b1_intermediate",
      goal: "conversation",
      daily_minutes: 15,
      timezone: "Asia/Tehran",
      interface_language: "fa",
      user_id: "attacker-controlled",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && "user_id" in parsed.data).toBe(false);

    expect(
      profileSchema.safeParse({
        level: "b1_intermediate",
        goal: "conversation",
        daily_minutes: 15,
        timezone: "Asia/Tehran",
        interface_language: "fr",
      }).success,
    ).toBe(false);
  });

  it("falls back to English translations for unknown languages", () => {
    expect(getMessages("unknown").nav.dashboard).toBe("Dashboard");
  });

  it("resolves persisted profile language after login", () => {
    expect(resolveInterfaceLanguage({ interface_language: "fa" })).toBe("fa");
    expect(resolveInterfaceLanguage({ interface_language: "en" })).toBe("en");
    expect(resolveInterfaceLanguage(null)).toBe("en");
  });

  it("uses RTL only for Persian", () => {
    expect(getTextDirection("fa")).toBe("rtl");
    expect(getTextDirection("en")).toBe("ltr");
    expect(getTextDirection(undefined)).toBe("ltr");
  });

  it("formats translated strings with runtime values", () => {
    expect(formatMessage(getMessages("fa").dashboard.eyebrow, { minutes: 15 }))
      .toContain("15");
  });
});
