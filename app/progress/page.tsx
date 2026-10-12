import { requireProfile } from "@/lib/actions/profile";
import { getProgressData } from "@/lib/actions/progress";
import { getMessages } from "@/lib/i18n/config";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default async function ProgressPage() {
  const profile = await requireProfile();
  const progress = await getProgressData();
  const messages = getMessages(profile.interface_language);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={messages.progress.eyebrow}
        title={messages.progress.heading}
        description={messages.progress.body}
      />

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
        <Card className="p-5">
          <h2 className="font-semibold">{messages.progress.topics}</h2>
          <div className="mt-4 space-y-3">
            {progress.topicCounts.length ? (
              progress.topicCounts.map((topic) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm"
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
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">{messages.progress.weakAreas}</h2>
          <div className="mt-4 space-y-3">
            {progress.weakAreas.length ? (
              progress.weakAreas.map((area) => (
                <div
                  key={area.category}
                  className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm"
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
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold">{messages.progress.recent}</h2>
        <div className="mt-4 space-y-3">
          {progress.recentActivity.length ? (
            progress.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex flex-col gap-1 rounded-xl border bg-background px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
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
      </Card>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Card>
  );
}
