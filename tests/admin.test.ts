import { describe, expect, it } from "vitest";
import {
  accountDestination,
  adminMutationSchema,
  userFiltersSchema,
  transitions,
} from "@/lib/admin/model";
import { getMessages } from "@/lib/i18n/config";
const target = "90000000-0000-4000-8000-000000000002";
describe("approval policy and bounded validation", () => {
  it.each([
    ["pending", "/approval-pending"],
    ["active", null],
    ["suspended", "/account-suspended"],
    ["rejected", "/account-rejected"],
    [undefined, "/approval-pending"],
  ])("routes %s safely", (status, path) =>
    expect(accountDestination(status)).toBe(path),
  );
  it.each(Object.keys(transitions))("accepts %s with UUID target", (action) =>
    expect(adminMutationSchema.safeParse({ target, action }).success).toBe(
      true,
    ),
  );
  it("rejects forged roles, missing/invalid targets and arbitrary fields", () => {
    for (const input of [
      { target: "other", action: "user_approved" },
      { action: "user_approved" },
      { target, action: "user_approved", admin: true },
      { target, action: "delete" },
    ])
      expect(adminMutationSchema.safeParse(input).success).toBe(false);
  });
  it.each(["light", "dark", "system", "auto"])(
    "preserves %s theme and Persian profile validation",
    (theme_preference) => {
      expect(
        adminMutationSchema.safeParse({
          target,
          action: "user_updated",
          profile: {
            level: "a2_elementary",
            goal: "work",
            daily_minutes: 15,
            timezone: "Asia/Tehran",
            interface_language: "fa",
            theme_preference,
          },
        }).success,
      ).toBe(true);
    },
  );
  it("rejects invalid editable values and status injection", () => {
    const profile = {
      level: "a2_elementary",
      goal: "work",
      daily_minutes: 15,
      timezone: "UTC",
    };
    for (const changed of [
      { daily_minutes: 100 },
      { timezone: "invented" },
      { status: "active" },
      { theme_preference: "neon" },
      { interface_language: "xx" },
    ])
      expect(
        adminMutationSchema.safeParse({
          target,
          action: "user_updated",
          profile: { ...profile, ...changed },
        }).success,
      ).toBe(false);
  });
  it("bounds search and pagination", () => {
    for (const input of [
      { search: "x".repeat(101) },
      { page: 0 },
      { page: 10001 },
      { status: "admin" },
    ])
      expect(userFiltersSchema.safeParse(input).success).toBe(false);
  });
  it("maintains full English/Persian admin catalog parity", () => {
    expect(Object.keys(getMessages("fa").admin).sort()).toEqual(
      Object.keys(getMessages("en").admin).sort(),
    );
    expect(
      Object.values(getMessages("fa").admin).every((value) =>
        /[\u0600-\u06ff]/.test(value),
      ),
    ).toBe(true);
  });
});
