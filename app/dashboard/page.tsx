import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/actions/profile";
import { getTodaysLesson } from "@/lib/actions/dailyLesson";
import { getProgressData } from "@/lib/actions/progress";

const activities = ["Vocabulary", "Sentence", "Reading", "Speaking"];

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [lesson, progress] = await Promise.all([
    getTodaysLesson(),
    getProgressData(),
  ]);
  const isReady = lesson?.generation_status === "ready";

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Ready for your {profile.daily_minutes} minute English practice?
        </p>
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-normal">
            Your focused English practice is ready.
          </h1>
          <p className="text-muted-foreground">
            A calm 10-15 minute plan with vocabulary, one useful sentence,
            short input, and a speaking prompt.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Today&apos;s practice</h2>
            <Button asChild>
              <Link href="/practice">
                {isReady ? "Open practice" : "Generate practice"}
              </Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {activities.map((activity) => (
              <div
                key={activity}
                className="flex items-center gap-3 rounded-md border bg-background p-3"
              >
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-medium">{activity}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {lesson?.completed
              ? "Today's lesson is completed and available for review."
              : isReady
                ? "Today's lesson is ready."
                : "No lesson has been generated for today yet."}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Progress</h2>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/progress">Progress</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/mistakes">Mistakes</Link>
              </Button>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Current streak</dt>
              <dd className="mt-1 text-2xl font-semibold">
                {progress.summary.currentStreak} days
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Last 14 days</dt>
              <dd className="mt-1 text-2xl font-semibold">
                {progress.summary.practiceDaysLast14}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm text-muted-foreground">
                Observed correction categories
              </dt>
              <dd className="mt-2 space-y-2 text-sm">
                {progress.weakAreas.length
                  ? progress.weakAreas.map((area) => (
                      <div
                        key={area.category}
                        className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                      >
                        <span>{area.category}</span>
                        <span className="text-muted-foreground">
                          {area.count}
                        </span>
                      </div>
                    ))
                  : "No correction patterns yet."}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
