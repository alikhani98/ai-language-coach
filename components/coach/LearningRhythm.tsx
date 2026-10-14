import { Check, Flame, BookOpenCheck } from "lucide-react";
import { getDateKeysEndingToday, type ProgressSummary } from "@/lib/progress/model";
import { formatMessage, type Messages, type InterfaceLanguage } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type LearningRhythmProps = {
  summary: ProgressSummary;
  timezone: string;
  language: InterfaceLanguage;
  messages: Messages;
};

export function LearningRhythm({ summary, timezone, language, messages }: LearningRhythmProps) {
  const days = getDateKeysEndingToday(new Date(), timezone, 7).reverse();
  const practicedDays = new Set(summary.practiceDays);
  const number = new Intl.NumberFormat(language);
  const weekday = new Intl.DateTimeFormat(language, { weekday: "narrow", timeZone: "UTC" });
  const fullDate = new Intl.DateTimeFormat(language, { dateStyle: "long", timeZone: "UTC" });
  const dayNumber = new Intl.DateTimeFormat(language, { day: "numeric", timeZone: "UTC" });

  return (
    <section aria-labelledby="learning-rhythm-title" className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="learning-rhythm-title" className="text-lg font-semibold">{messages.coach.rhythm}</h2>
        <span className="text-xs text-muted-foreground">{messages.progress.last7}</span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-muted-foreground">{messages.dashboard.currentStreak}</dt>
          <dd className="mt-2 flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-700 dark:text-orange-300" />
            <span className="text-3xl font-semibold tabular-nums">{number.format(summary.currentStreak)}</span>
            <span className="text-xs text-muted-foreground">{messages.common.days}</span>
          </dd>
        </div>
        <div className="border-s ps-5">
          <dt className="text-xs text-muted-foreground">{messages.progress.completedLessons}</dt>
          <dd className="mt-2 flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5 text-primary" />
            <span className="text-3xl font-semibold tabular-nums">{number.format(summary.totalCompletedLessons)}</span>
          </dd>
        </div>
      </dl>
      <div className="relative mt-6">
        <div aria-hidden="true" className="absolute inset-x-5 top-12 h-px bg-border" />
        <ol aria-label={messages.coach.weeklyActivity} className="relative grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const active = practicedDays.has(day);
          const date = new Date(`${day}T12:00:00.000Z`);
          const label = `${fullDate.format(date)}: ${active ? messages.coach.practiced : messages.coach.noPractice}`;
          return (
            <li key={day} aria-label={label} title={label} className="flex min-w-0 flex-col items-center text-center">
              <span aria-hidden="true" className={cn("mb-3 block h-4 text-[11px] leading-4", index === days.length - 1 ? "font-semibold text-primary" : "text-muted-foreground")}>
                {index === days.length - 1 ? messages.coach.today : weekday.format(date)}
              </span>
              <span aria-hidden="true" className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
                active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background text-muted-foreground",
                index === days.length - 1 && "ring-1 ring-primary/40 ring-offset-2 ring-offset-background",
              )}>
                {dayNumber.format(date)}
                {active ? <span className="absolute -bottom-1 -end-1 rounded-full border border-background bg-card p-0.5 text-primary"><Check className="h-2.5 w-2.5" /></span> : null}
              </span>
            </li>
          );
        })}
        </ol>
      </div>
      <div className="mt-5 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium">{messages.coach.momentum}</span>
          <span className="text-muted-foreground">{formatMessage(messages.coach.daysThisWeek, { count: number.format(summary.practiceDaysLast7) })}</span>
        </div>
        <div role="meter" aria-label={messages.coach.momentum} aria-valuemin={0} aria-valuemax={7} aria-valuenow={summary.practiceDaysLast7} className="mt-3 flex gap-1">
          {days.map((day, index) => <span key={day} className={cn("h-1.5 flex-1 rounded-full", index < summary.practiceDaysLast7 ? "bg-primary" : "bg-muted")} />)}
        </div>
      </div>
    </section>
  );
}
