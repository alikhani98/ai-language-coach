import { requireProfile } from "@/lib/actions/profile";
import { getProgressData } from "@/lib/actions/progress";
import { getMessages } from "@/lib/i18n/config";

export default async function ProgressPage() {
  const profile = await requireProfile();
  const progress = await getProgressData();
  const messages = getMessages(profile.interface_language);

  return (
    <section className="space-y-6">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          {messages.progress.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          {messages.progress.heading}
        </h1>
        <p className="text-muted-foreground">
          {messages.progress.body}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label={messages.progress.last7}
          value={`${progress.summary.practiceDaysLast7} ${messages.common.days}`}
        />
        <Metric
          label={messages.progress.last14}
          value={`${progress.summary.practiceDaysLast14} ${messages.common.days}`}
        />
        <Metric
          label={messages.progress.currentStreak}
          value={`${progress.summary.currentStreak} ${messages.common.days}`}
        />
        <Metric
          label={messages.progress.completedLessons}
          value={`${progress.summary.totalCompletedLessons}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold">{messages.progress.topics}</h2>
          <div className="mt-4 space-y-3">
            {progress.topicCounts.length ? (
              progress.topicCounts.map((topic) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <span>{topic.topic.replaceAll("_", " ")}</span>
                  <span className="text-muted-foreground">
                    {topic.count}{" "}
                    {topic.count === 1
                      ? messages.progress.conversation
                      : messages.progress.conversations}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {messages.progress.noTopics}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold">{messages.progress.weakAreas}</h2>
          <div className="mt-4 space-y-3">
            {progress.weakAreas.length ? (
              progress.weakAreas.map((area) => (
                <div
                  key={area.category}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <span>{area.category}</span>
                  <span className="text-muted-foreground">
                    {area.count}{" "}
                    {area.count === 1
                      ? messages.progress.correction
                      : messages.progress.corrections}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {messages.progress.noWeakAreas}
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">{messages.progress.recent}</h2>
        <div className="mt-4 space-y-3">
          {progress.recentActivity.length ? (
            progress.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex flex-col gap-1 rounded-md border bg-background px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  {activity.type === "daily_lesson"
                    ? messages.dashboard.completed
                    : messages.progress.conversation}
                </span>
                <span className="text-muted-foreground">
                  {activity.occurred_at}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {messages.progress.noActivity}
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
