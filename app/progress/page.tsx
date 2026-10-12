import { requireProfile } from "@/lib/actions/profile";
import { getProgressData } from "@/lib/actions/progress";

export default async function ProgressPage() {
  await requireProfile();
  const progress = await getProgressData();

  return (
    <section className="space-y-6">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Progress tracking
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Your recent English practice
        </h1>
        <p className="text-muted-foreground">
          Practice days are counted from completed lessons or completed
          conversation exchanges, using your local calendar day.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Last 7 days"
          value={`${progress.summary.practiceDaysLast7} days`}
        />
        <Metric
          label="Last 14 days"
          value={`${progress.summary.practiceDaysLast14} days`}
        />
        <Metric
          label="Current streak"
          value={`${progress.summary.currentStreak} days`}
        />
        <Metric
          label="Completed lessons"
          value={`${progress.summary.totalCompletedLessons}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Topics practiced</h2>
          <div className="mt-4 space-y-3">
            {progress.topicCounts.length ? (
              progress.topicCounts.map((topic) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <span>{topic.topic.replaceAll("_", " ")}</span>
                  <span className="text-muted-foreground">
                    {topic.count} {topic.count === 1 ? "conversation" : "conversations"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed conversation exchanges yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Observed weak areas</h2>
          <div className="mt-4 space-y-3">
            {progress.weakAreas.length ? (
              progress.weakAreas.map((area) => (
                <div
                  key={area.category}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <span>{area.category}</span>
                  <span className="text-muted-foreground">
                    {area.count} {area.count === 1 ? "correction" : "corrections"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No correction patterns have been observed yet.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Recent learning activity</h2>
        <div className="mt-4 space-y-3">
          {progress.recentActivity.length ? (
            progress.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex flex-col gap-1 rounded-md border bg-background px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span>{activity.title}</span>
                <span className="text-muted-foreground">
                  {activity.occurred_at}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No completed practice yet.
            </p>
          )}
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
