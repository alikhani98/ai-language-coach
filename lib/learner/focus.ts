import { formatMessage, type Messages } from "@/lib/i18n/config";
import type { LearnerContext } from "@/lib/learner/context";

export function learnerFocus(context: LearnerContext, messages: Messages) {
  const area = context.weakAreas[0];
  const label = messages.intelligence.areas[area as keyof Messages["intelligence"]["areas"]];
  return label ? formatMessage(messages.intelligence.reason, { area: label })
    : `${messages.intelligence.newFocus} ${messages.coach.objectives[context.goal as keyof Messages["coach"]["objectives"]] ?? ""}`.trim();
}
