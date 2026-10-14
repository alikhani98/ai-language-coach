import { ArrowRight, BookOpenCheck, MessageCircle } from "lucide-react";
import Link from "next/link";
import { requireProfile } from "@/lib/actions/profile";
import { requireUser } from "@/lib/auth/user";
import { getTodaysLesson } from "@/lib/actions/dailyLesson";
import { getProgressData } from "@/lib/actions/progress";
import { formatMessage, getMessages } from "@/lib/i18n/config";
import { CoachAvatar } from "@/components/coach/AICoachMessage";
import { CoachInsight } from "@/components/coach/CoachInsight";
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
  const objective = messages.coach.objectives[profile.goal] ?? messages.practice.heading;
  const intro = lesson?.completed
    ? messages.coach.headerCompleted
    : lesson?.generation_status === "ready"
      ? messages.coach.headerReady
      : messages.coach.headerPrepare;

  return (
    <div className="coach-home-grid">
      <section aria-labelledby="personal-coach-title" className="coach-home-greeting min-w-0">
        <div className="flex items-center gap-3">
          <CoachAvatar small />
          <div>
            <p className="text-sm font-semibold">{messages.coach.name}</p>
            <p className="text-xs text-muted-foreground">{messages.coach.personalCoach}</p>
          </div>
        </div>
        <h1 id="personal-coach-title" className="mt-4 text-2xl font-semibold leading-snug sm:text-3xl">
          {formatMessage(messages.dashboard.greeting, { name: displayName })}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
          {formatMessage(intro, { minutes: new Intl.NumberFormat(profile.interface_language).format(profile.daily_minutes) })}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">{level}</span>
          <p className="text-xs leading-6"><span className="text-muted-foreground">{messages.coach.todayFocus}: </span>{objective}</p>
        </div>
        <p className="mt-3 max-w-md text-xs leading-6 text-muted-foreground">{messages.coach.dailyMotivation}</p>
      </section>

      <div className="coach-home-mission">
        <TodaysMission
          lesson={lesson}
          minutes={profile.daily_minutes}
          level={level}
          title={messages.coach.missionTitles[profile.goal] ?? messages.practice.heading}
          objective={objective}
          language={profile.interface_language}
          messages={messages}
        />
      </div>

      <div className="coach-home-insight">
        <CoachInsight
          category={progress.weakAreas[0]?.category}
          hasPractice={progress.summary.practiceDays.length > 0}
          completed={Boolean(lesson?.completed)}
          messages={messages}
        />
      </div>

      <div className="coach-home-rhythm border-t pt-5">
        <LearningRhythm
          summary={progress.summary}
          timezone={profile.timezone}
          language={profile.interface_language}
          messages={messages}
        />
        <Link href="/progress" className="mt-2 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary">
          {messages.nav.progress}<ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>

      <section aria-labelledby="coach-next-title" className="coach-home-actions">
        <h2 id="coach-next-title" className="mb-2 text-sm font-semibold">{messages.coach.nextStep}</h2>
        {[
          { href: "/conversation", icon: MessageCircle, title: messages.nav.conversation, body: messages.coach.conversationNudge },
          { href: "/mistakes", icon: BookOpenCheck, title: messages.nav.mistakes, body: messages.coach.notebookNudge },
        ].map(({ href, icon: Icon, title, body }) => (
          <Link key={href} href={href} className="group flex items-center gap-4 border-b py-4 transition-colors last:border-0 hover:text-primary">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-card text-primary transition-colors group-hover:border-primary/30 group-hover:bg-primary/5"><Icon className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">{body}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
          </Link>
        ))}
      </section>
    </div>
  );
}
