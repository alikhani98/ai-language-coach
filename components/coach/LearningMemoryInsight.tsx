import { CoachAvatar } from "@/components/coach/AICoachMessage";
import { getMessages } from "@/lib/i18n/config";
import type { LearnerMemory } from "@/lib/memory/learnerMemory";
import { coachMemoryCopy } from "@/lib/memory/presentation";

export function LearningMemoryInsight({ memory, language }: { memory: LearnerMemory; language: string }) {
  const ui = getMessages(language).memory;
  const copy = coachMemoryCopy(memory, language);
  return (
    <aside aria-labelledby="coach-memory-title" className="flex min-w-0 items-start gap-3">
      <CoachAvatar small />
      <div className="coach-insight-bubble min-w-0 flex-1 space-y-4 rounded-xl rounded-ss-none border bg-card p-5 sm:p-6">
        <h2 id="coach-memory-title" className="type-section text-primary">{ui.noticed}</h2>
        <p className="text-sm type-copy">{copy.strength}</p>
        <dl className="space-y-4 border-t pt-4">
          <div>
            <dt className="text-xs font-semibold text-muted-foreground">{ui.challenge}</dt>
            <dd className="mt-1 text-sm type-copy">{copy.challenge}</dd>
            {copy.historical ? <dd className="mt-2 text-xs text-muted-foreground">{copy.historical}</dd> : null}
          </div>
          <div className="border-s-2 border-primary/30 ps-4">
            <dt className="text-xs font-semibold text-primary">{ui.recommendation}</dt>
            <dd className="mt-1 text-sm type-copy">{copy.recommendation}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
