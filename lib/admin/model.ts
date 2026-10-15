import { z } from "zod";
import { profileSchema } from "@/lib/validations/profile";
export const accountStatuses = [
  "pending",
  "active",
  "suspended",
  "rejected",
] as const;
export type AccountStatus = (typeof accountStatuses)[number];
export const transitions = {
  user_approved: ["pending", "active"],
  user_rejected: ["pending", "rejected"],
  user_suspended: ["active", "suspended"],
  user_reactivated: ["suspended", "active"],
} as const;
export type Transition = keyof typeof transitions;
export function accountDestination(status?: string | null) {
  if (status === "active") return null;
  if (status === "suspended") return "/account-suspended";
  if (status === "rejected") return "/account-rejected";
  return "/approval-pending";
}
export const targetSchema = z.string().uuid();
export const adminMutationSchema = z.discriminatedUnion("action", [
  z
    .object({
      target: targetSchema,
      action: z.enum([
        "user_approved",
        "user_rejected",
        "user_suspended",
        "user_reactivated",
      ]),
    })
    .strict(),
  z
    .object({
      target: targetSchema,
      action: z.literal("user_updated"),
      profile: profileSchema.strict(),
    })
    .strict(),
]);
export const userFiltersSchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.enum(["", ...accountStatuses]).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
