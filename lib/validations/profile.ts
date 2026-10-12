import { z } from "zod";

export const profileLevels = [
  "a1_beginner",
  "a2_elementary",
  "b1_intermediate",
  "b2_upper_intermediate",
  "c1_advanced",
] as const;

export const profileGoals = [
  "conversation",
  "work",
  "travel",
  "exam",
  "personal_growth",
] as const;

export function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export const profileSchema = z.object({
  level: z.enum(profileLevels),
  goal: z.enum(profileGoals),
  daily_minutes: z.coerce
    .number()
    .int()
    .refine((value) => [10, 15, 30].includes(value), {
      message: "Choose a daily practice time.",
    }),
  timezone: z
    .string()
    .min(1)
    .default("UTC")
    .refine(isValidTimeZone, "Choose a valid timezone."),
});

export type ProfileInput = z.infer<typeof profileSchema>;
