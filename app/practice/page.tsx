import { requireProfile } from "@/lib/actions/profile";
import { getTodaysLesson } from "@/lib/actions/dailyLesson";
import { PracticeWorkspace } from "@/components/practice-workspace";

export default async function PracticePage() {
  const profile = await requireProfile();
  const lesson = await getTodaysLesson();

  return (
    <section className="space-y-6">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Daily Language Coach
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Today&apos;s English practice
        </h1>
        <p className="text-muted-foreground">
          A focused lesson for your level, goal, and local calendar day.
        </p>
      </div>
      <PracticeWorkspace
        initialLesson={lesson}
        dailyMinutes={profile.daily_minutes}
      />
    </section>
  );
}
