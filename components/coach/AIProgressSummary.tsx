import type { ProgressSummary } from "@/lib/learner/summary";
import type { Messages } from "@/lib/i18n/config";

export function AIProgressSummary({ summary, messages }: { summary: ProgressSummary; messages: Messages }) {
  return (
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-5" aria-label={messages.intelligence.summary}>
      <h2 className="font-semibold text-primary">{messages.intelligence.summary}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {(["vocabulary", "grammar", "speaking", "tomorrow"] as const).map((key) => (
          <div key={key}>
            <dt className="text-xs font-semibold text-muted-foreground">{messages.intelligence[key]}</dt>
            <dd dir="auto" className="mt-1 text-sm leading-7">{summary[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
