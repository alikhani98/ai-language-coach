import {
  ArrowRight,
  CheckCircle2,
  Flame,
  MessageCircle,
  Sparkles,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/actions/profile";
import { requireUser } from "@/lib/auth/user";
import { getTodaysLesson } from "@/lib/actions/dailyLesson";
import { getProgressData } from "@/lib/actions/progress";
import { formatMessage, getMessages } from "@/lib/i18n/config";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await requireProfile();
  const [lesson, progress] = await Promise.all([
    getTodaysLesson(),
    getProgressData(),
  ]);
  const isReady = lesson?.generation_status === "ready";
  const messages = getMessages(profile.interface_language);
  const displayName = user.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={formatMessage(messages.dashboard.eyebrow, {
          minutes: profile.daily_minutes,
        })}
        title={formatMessage(messages.dashboard.greeting, {
          name: displayName,
        })}
        description={messages.dashboard.body}
      >
        <Button asChild>
          <Link href="/practice">
            {isReady
              ? messages.dashboard.openPractice
              : messages.dashboard.generatePractice}
            <ArrowRight className="ml-2 h-4 w-4 rtl:ml-0 rtl:mr-2 rtl:rotate-180" />
          </Link>
        </Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5" />
              <p className="text-sm font-medium opacity-90">
                {messages.dashboard.todaysPractice}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {profile.daily_minutes} min
            </p>
            <p className="mt-2 text-sm opacity-90">
              {lesson?.completed
                ? messages.dashboard.completed
                : isReady
                  ? messages.dashboard.ready
                  : messages.dashboard.none}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Flame className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                {messages.dashboard.currentStreak}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {progress.summary.currentStreak}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {messages.common.days}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                {messages.dashboard.last14Days}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {progress.summary.practiceDaysLast14}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {messages.common.days}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">
              {messages.dashboard.quickActions}
            </h2>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button asChild className="h-16 justify-between px-5">
              <Link href="/practice">
                <span>{messages.dashboard.openPractice}</span>
                <Sparkles className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-16 justify-between px-5">
              <Link href="/conversation">
                <span>{messages.nav.conversation}</span>
                <MessageCircle className="h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">
              {messages.dashboard.weakAreas}
            </h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {progress.weakAreas.length
              ? progress.weakAreas.map((area) => (
                  <div
                    key={area.category}
                    className="flex items-center justify-between rounded-xl border bg-background px-3 py-2"
                  >
                    <span>{area.category}</span>
                    <span className="text-muted-foreground">{area.count}</span>
                  </div>
                ))
              : messages.dashboard.noPatterns}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
