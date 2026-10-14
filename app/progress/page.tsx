import { requireProfile } from "@/lib/actions/profile";
import { getProgressData } from "@/lib/actions/progress";
import { getMessages } from "@/lib/i18n/config";
import { PageHeader } from "@/components/ui/page-header";
import { CheckCircle2, MessageCircle, Activity } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/section-title";
import { LearningRhythm } from "@/components/coach/LearningRhythm";
import { AICoachMessage } from "@/components/coach/AICoachMessage";

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

      <div className="grid gap-8 py-2 lg:grid-cols-2 lg:gap-12">
        <LearningRhythm summary={progress.summary} timezone={profile.timezone} language={profile.interface_language} messages={messages} />
        <div className="space-y-6 border-t pt-6 lg:border-s lg:border-t-0 lg:ps-8 lg:pt-0">
          <AICoachMessage name={messages.coach.name} label={messages.coach.role} message={progress.summary.currentStreak > 0 ? messages.coach.returnMessage : messages.coach.newMessage} />
          <section>
            <h2 className="text-sm font-medium text-muted-foreground">{messages.progress.last14}</h2>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{new Intl.NumberFormat(profile.interface_language).format(progress.summary.practiceDaysLast14)} <span className="text-sm font-normal text-muted-foreground">{messages.common.days}</span></p>
            <div role="meter" aria-label={messages.progress.last14} aria-valuemin={0} aria-valuemax={14} aria-valuenow={progress.summary.practiceDaysLast14} className="mt-3 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 14 }, (_, index) => <span key={index} className={`h-2 rounded-full ${index < progress.summary.practiceDaysLast14 ? "bg-primary" : "bg-muted"}`} />)}
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="section-surface">
          <SectionTitle title={messages.progress.topics} />
          <div className="mt-4 space-y-3">
            {progress.topicCounts.length ? (
              progress.topicCounts.map((topic) => (
                <div
                  key={topic.topic}
                  className="quiet-row text-sm"
                >
                  <span className="font-medium">{messages.conversation.topics[topic.topic as keyof typeof messages.conversation.topics] ?? topic.topic.replaceAll("_", " ")}</span>
                  <span className="text-muted-foreground">
                    {new Intl.NumberFormat(profile.interface_language).format(topic.count)}{" "}
                    {topic.count === 1
                      ? messages.progress.conversation
                      : messages.progress.conversations}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState icon={MessageCircle} title={messages.progress.noTopics} description={messages.dashboard.conversationAction} />
            )}
          </div>
        </section>

        <section className="section-surface">
          <SectionTitle title={messages.progress.weakAreas} />
          <div className="mt-4 space-y-3">
            {progress.weakAreas.length ? (
              progress.weakAreas.map((area) => (
                <div
                  key={area.category}
                  className="quiet-row text-sm"
                >
                  <span>{messages.coach.categories[area.category as keyof typeof messages.coach.categories] ?? area.category}</span>
                  <span className="text-muted-foreground">
                    {new Intl.NumberFormat(profile.interface_language).format(area.count)}{" "}
                    {area.count === 1
                      ? messages.progress.correction
                      : messages.progress.corrections}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState icon={CheckCircle2} title={messages.dashboard.noPatterns} description={messages.progress.noWeakAreas} />
            )}
          </div>
        </section>
      </div>

      <section className="border-t pt-6">
        <SectionTitle title={messages.progress.recent} />
        <div className="mt-4 space-y-3">
          {progress.recentActivity.length ? (
            progress.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex flex-col gap-2 border-b py-4 text-sm last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  {activity.type === "daily_lesson"
                    ? messages.dashboard.completed
                    : messages.progress.conversation}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {new Intl.DateTimeFormat(profile.interface_language, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${activity.occurred_at}T12:00:00Z`))}
                </span>
              </div>
            ))
          ) : (
            <EmptyState icon={Activity} title={messages.progress.noActivity} description={messages.dashboard.practiceAction} />
          )}
        </div>
      </section>
    </section>
  );
}
