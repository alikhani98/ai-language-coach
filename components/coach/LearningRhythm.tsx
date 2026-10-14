import { Check, Flame, BookOpenCheck, ArrowUpRight } from "lucide-react";
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

  return (
    <section aria-labelledby="learning-rhythm-title" className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="learning-rhythm-title" className="text-lg font-semibold">{messages.coach.rhythm}</h2>
        <span className="text-xs text-muted-foreground">{messages.progress.last7}</span>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-700 dark:text-orange-300">
          <Flame className="h-6 w-6" />
        </span>
        <div>
          <p className="text-lg font-semibold">{formatMessage(messages.coach.streakDays, { count: number.format(summary.currentStreak) })}</p>
          <p className="text-xs text-muted-foreground">{messages.dashboard.currentStreak}</p>
        </div>
      </div>
      <ol aria-label={messages.coach.weeklyActivity} className="mt-5 grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const active = practicedDays.has(day);
          const date = new Date(`${day}T12:00:00.000Z`);
          const label = `${fullDate.format(date)}: ${active ? messages.coach.practiced : messages.coach.noPractice}`;
          return (
            <li key={day} aria-label={label} title={label} className="min-w-0 text-center">
              <span aria-hidden="true" className={cn(
                "flex h-10 items-center justify-center rounded-lg border text-sm",
                active ? "border-primary/30 bg-primary text-primary-foreground" : "border-border bg-muted/50 text-muted-foreground",
                index === days.length - 1 && "ring-1 ring-primary/40 ring-offset-2 ring-offset-background",
              )}>
                {active ? <Check className="h-4 w-4" /> : <span className="h-1 w-1 rounded-full bg-current opacity-50" />}
              </span>
              <span aria-hidden="true" className="mt-2 block text-xs text-muted-foreground">{weekday.format(date)}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-5 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 font-medium"><ArrowUpRight className="h-3.5 w-3.5 text-primary rtl:-scale-x-100" />{messages.coach.momentum}</span>
          <span className="text-muted-foreground">{formatMessage(messages.coach.daysThisWeek, { count: number.format(summary.practiceDaysLast7) })}</span>
        </div>
        <div role="meter" aria-label={messages.coach.momentum} aria-valuemin={0} aria-valuemax={7} aria-valuenow={summary.practiceDaysLast7} className="mt-3 flex gap-1">
          {days.map((day, index) => <span key={day} className={cn("h-1.5 flex-1 rounded-full", index < summary.practiceDaysLast7 ? "bg-primary" : "bg-muted")} />)}
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <BookOpenCheck className="h-4 w-4 text-primary" />
        {formatMessage(messages.coach.completedLessons, { count: number.format(summary.totalCompletedLessons) })}
      </p>
    </section>
  );
}
