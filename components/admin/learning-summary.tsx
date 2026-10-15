import { Card } from "@/components/ui/card";
import { buildLearnerMemory } from "@/lib/memory/learnerMemory";
import type { Messages, InterfaceLanguage } from "@/lib/i18n/config";
export function LearningSummary({
  snapshot,
  messages,
  language,
}: {
  snapshot?: { snapshot: unknown; as_of: string } | null;
  messages: Messages;
  language: InterfaceLanguage;
}) {
  const m = messages.admin;
  let memory;
  try {
    if (snapshot)
      memory = buildLearnerMemory(snapshot.snapshot, snapshot.as_of);
  } catch {
    /* Optional saved summary may be missing or invalid. */
  }
  return (
    <Card className="space-y-4 p-5 sm:p-7">
      <h2 className="type-section">{m.learning}</h2>
      {memory ? (
        <>
          <p className="text-sm text-muted-foreground">
            {m.snapshotDate}{" "}
            {new Intl.DateTimeFormat(language, {
              dateStyle: "medium",
              timeZone: "UTC",
            }).format(new Date(memory.asOf))}
          </p>
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              [m.practiceDays, memory.weekly.current.days],
              [
                messages.memory.sessions,
                memory.weekly.current.lessons +
                  memory.weekly.current.conversations,
              ],
              [messages.memory.exchanges, memory.weekly.current.exchanges],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-2 text-xl font-semibold">
                  {new Intl.NumberFormat(language).format(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
          <h3 className="text-sm font-medium">{m.weakAreas}</h3>
          {memory.weaknesses.length ? (
            <ul className="flex flex-wrap gap-2">
              {memory.weaknesses.map((pattern) => (
                <li
                  className="rounded-full bg-secondary px-3 py-1 text-sm"
                  key={pattern.topic}
                >
                  {messages.intelligence.areas[pattern.topic]}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{m.noPatterns}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {messages.memory.sessionDefinition}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{m.noMemory}</p>
      )}
    </Card>
  );
}
