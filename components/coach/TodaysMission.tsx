import Link from "next/link";
import { ArrowRight, BookOpenText, CheckCircle2, MessageSquareText, Mic, Sparkles, Timer } from "lucide-react";
import type { DailyLesson } from "@/lib/daily/lesson";
import { Button } from "@/components/ui/button";
import { formatMessage, type InterfaceLanguage, type Messages } from "@/lib/i18n/config";

type TodaysMissionProps = {
  lesson: DailyLesson | null;
  minutes: number;
  level: string;
  objective: string;
  language: InterfaceLanguage;
  messages: Messages;
};

const activityIcons = [BookOpenText, MessageSquareText, BookOpenText, Mic];

export function TodaysMission({
  lesson, minutes, level, objective, language, messages,
}: TodaysMissionProps) {
  const completed = Boolean(lesson?.completed);
  const ready = lesson?.generation_status === "ready";
  const pending = lesson?.generation_status === "pending";
  const failed = lesson?.generation_status === "failed";
  const number = new Intl.NumberFormat(language);
  const percent = new Intl.NumberFormat(language, { style: "percent" });
  const status = completed ? messages.common.completed
    : pending ? messages.practice.pendingTitle
      : failed ? messages.practice.failedTitle
        : ready ? messages.coach.ready : messages.coach.notStarted;
  const description = completed ? messages.coach.missionCompleted
    : pending ? messages.practice.pendingBody
      : failed ? messages.practice.failedBody
        : ready ? messages.coach.missionReady : messages.coach.missionIntro;
  const ctaLabel = completed ? messages.coach.reviewPractice
    : pending ? messages.dashboard.openPractice
      : failed ? messages.practice.retryButton
        : ready ? messages.coach.startPractice : messages.practice.generateButton;

  return (
    <section aria-labelledby="mission-title" className="coach-mission rounded-xl p-5 text-white sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-medium text-white/80"><Sparkles className="h-4 w-4" />{messages.coach.mission}</p>
        <span className="rounded-full border border-white/25 px-3 py-1 text-xs">{level}</span>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs text-white/75">
        <Timer className="h-4 w-4" />
        {formatMessage(messages.practice.minutePractice, { minutes: number.format(minutes) })}
        <span aria-hidden="true">·</span>
        {messages.coach.lessonType}
      </div>
      <p className="mt-5 text-xs text-white/75">{messages.coach.focus}</p>
      <h2 id="mission-title" className="mt-1 text-2xl font-semibold leading-snug sm:text-3xl">{objective}</h2>
      <p className="mt-3 hidden max-w-lg text-sm leading-7 text-white/80 sm:block">
        {description}
      </p>
      <Button asChild className="mt-5 min-h-14 w-full justify-between border-white bg-white px-5 text-base text-teal-950 shadow-lg shadow-black/10 hover:bg-white/90">
        <Link href="/practice">
          {ctaLabel}
          <ArrowRight className="h-5 w-5 rtl:rotate-180" />
        </Link>
      </Button>
      <div className="mt-5 grid grid-cols-4 gap-2 border-y border-white/15 py-4">
        {messages.dashboard.activities.map((activity, index) => {
          const Icon = activityIcons[index];
          return (
            <div key={activity} className="flex min-w-0 flex-col items-center gap-2 text-center text-xs text-white/85">
              <Icon className="h-4 w-4" />
              <span>{activity}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-white/80">
        <span className="flex items-center gap-2">{completed ? <CheckCircle2 className="h-4 w-4" /> : null}{status}</span>
        <span>{percent.format(completed ? 1 : 0)}</span>
      </div>
      <div role="progressbar" aria-label={messages.coach.missionProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completed ? 100 : 0} className="mt-2 h-1 rounded-full bg-white/20">
        <div className={`h-full rounded-full bg-white transition-[width] duration-500 ${completed ? "w-full" : "w-0"}`} />
      </div>
    </section>
  );
}
