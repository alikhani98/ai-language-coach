import { BookOpenText, CalendarDays, MessageCircle } from "lucide-react";
import { getMessages } from "@/lib/i18n/config";
import type { LearnerMemory } from "@/lib/memory/learnerMemory";
import { coachMemoryCopy } from "@/lib/memory/presentation";

export function WeeklyCoachReport({ memory, language }: { memory?: LearnerMemory; language: string }) {
  const ui = getMessages(language).memory;
  const copy = memory ? coachMemoryCopy(memory, language) : undefined;
  const current = memory?.weekly.current;
  const sessions = current ? current.lessons + current.conversations : 0;
  const stats = current ? [
    { label: ui.sessions, value: sessions, icon: CalendarDays },
    { label: ui.vocabulary, value: current.vocabulary, icon: BookOpenText },
    { label: ui.exchanges, value: current.exchanges, icon: MessageCircle },
  ] : [];
  return (
    <section aria-labelledby="weekly-coach-report-title" className="rounded-xl border bg-card p-5 sm:p-7">
      <div className="max-w-2xl space-y-2">
        <h2 id="weekly-coach-report-title" className="type-section">{ui.weeklyTitle}</h2>
        <p className="text-sm text-muted-foreground">{ui.weeklySubtitle}</p>
      </div>
      {!memory || !copy ? <p role="status" className="mt-5 text-sm type-copy text-muted-foreground">{ui.unavailable}</p> : (
        <>
          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="type-number mt-1 text-2xl font-semibold">{new Intl.NumberFormat(language).format(value)}</dd>
                </div>
              </div>
            ))}
          </dl>
          {sessions === 0 ? <p className="mt-5 text-sm type-copy text-muted-foreground">{ui.emptyWeek}</p> : null}
          <div className="mt-6 grid gap-5 border-t pt-5 sm:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{ui.improvement}</h3>
              <p className="text-sm type-copy">{copy.strength}</p>
              <p className="text-sm type-copy text-muted-foreground">{copy.feedback}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{ui.grammar}</h3>
              <p className="text-sm type-copy text-muted-foreground">{copy.grammar}</p>
              <p className="text-sm type-copy text-muted-foreground">{copy.grammarFeedback}</p>
              <p className="text-sm type-copy">{copy.challenge}</p>
            </div>
          </div>
          <div className="mt-5 border-s-2 border-primary/30 ps-4">
            <h3 className="text-xs font-semibold text-primary">{ui.recommendation}</h3>
            <p className="mt-1 text-sm type-copy">{copy.recommendation}</p>
          </div>
          <p className="mt-5 border-t pt-4 text-xs type-copy text-muted-foreground">{ui.sessionDefinition}</p>
        </>
      )}
      <p className="mt-3 text-xs type-copy text-muted-foreground">{ui.privacy}</p>
    </section>
  );
}
