import { ArrowRight, BookOpenCheck, MessageCircle } from "lucide-react";
import Link from "next/link";
import { requireProfile } from "@/lib/actions/profile";
import { requireUser } from "@/lib/auth/user";
import { getTodaysLesson } from "@/lib/actions/dailyLesson";
import { getProgressData } from "@/lib/actions/progress";
import { formatMessage, getMessages } from "@/lib/i18n/config";
import { AICoachMessage } from "@/components/coach/AICoachMessage";
import { TodaysMission } from "@/components/coach/TodaysMission";
import { LearningRhythm } from "@/components/coach/LearningRhythm";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await requireProfile();
  const [lesson, progress] = await Promise.all([
    getTodaysLesson(),
    getProgressData(),
  ]);
  const messages = getMessages(profile.interface_language);
  const displayName = user.email?.split("@")[0] ?? "there";
  const level = messages.onboarding.levels[profile.level]?.[0] ?? profile.level;
  const encouragement = lesson?.completed
    ? messages.coach.completedMessage
    : progress.summary.currentStreak > 0
      ? messages.coach.returnMessage
      : messages.coach.newMessage;

  return (
    <div className="space-y-7 sm:space-y-9">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-medium text-primary">{messages.coach.welcome}</p>
          <h1 className="text-2xl font-semibold leading-snug sm:text-4xl">
            {formatMessage(messages.dashboard.greeting, { name: displayName })}
          </h1>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {messages.coach.level}
          <span className="rounded-full border bg-card px-3 py-1.5 font-medium text-foreground">{level}</span>
        </p>
      </header>

      <AICoachMessage
        name={messages.coach.name}
        label={messages.coach.role}
        message={encouragement}
        advice={messages.coach.advice}
        className="max-w-3xl"
      />

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] lg:gap-10">
        <TodaysMission
          lesson={lesson}
          minutes={profile.daily_minutes}
          level={level}
          objective={messages.coach.objectives[profile.goal] ?? messages.practice.heading}
          language={profile.interface_language}
          messages={messages}
        />
        <div className="min-w-0 lg:pt-2">
          <LearningRhythm
            summary={progress.summary}
            timezone={profile.timezone}
            language={profile.interface_language}
            messages={messages}
          />
          <Link href="/progress" className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary">
            {messages.nav.progress}<ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>

      <section aria-labelledby="coach-next-title" className="border-t pt-6">
        <h2 id="coach-next-title" className="text-lg font-semibold">{messages.coach.nextStep}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-6">
          {[
            { href: "/conversation", icon: MessageCircle, title: messages.nav.conversation, body: messages.coach.conversationNudge },
            { href: "/mistakes", icon: BookOpenCheck, title: messages.nav.mistakes, body: messages.coach.notebookNudge },
          ].map(({ href, icon: Icon, title, body }) => (
            <Link key={href} href={href} className="group flex items-center gap-4 rounded-lg py-4 transition-colors hover:bg-secondary sm:px-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-6 text-muted-foreground">{body}</p></div>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary rtl:rotate-180" />
            </Link>
          ))}
        </div>
      </section>

      {progress.weakAreas.length ? (
        <section className="flex flex-wrap items-center gap-3 border-t pt-5 text-xs">
          <h2 className="font-medium text-muted-foreground">{messages.dashboard.weakAreas}</h2>
          {progress.weakAreas.map((area) => (
            <Link key={area.category} href={`/mistakes?category=${encodeURIComponent(area.category)}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-4 text-primary transition-colors hover:bg-primary/5">
              {messages.coach.categories[area.category as keyof typeof messages.coach.categories] ?? area.category}
              <span className="text-muted-foreground">{area.count}</span>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
