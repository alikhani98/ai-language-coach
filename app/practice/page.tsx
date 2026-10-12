import { requireProfile } from "@/lib/actions/profile";
import { getTodaysLesson } from "@/lib/actions/dailyLesson";
import { PracticeWorkspace } from "@/components/practice-workspace";
import { getMessages } from "@/lib/i18n/config";

export default async function PracticePage() {
  const profile = await requireProfile();
  const lesson = await getTodaysLesson();
  const messages = getMessages(profile.interface_language);

  return (
    <section className="space-y-6">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          {messages.practice.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          {messages.practice.heading}
        </h1>
        <p className="text-muted-foreground">
          {messages.practice.body}
        </p>
      </div>
      <PracticeWorkspace
        initialLesson={lesson}
        dailyMinutes={profile.daily_minutes}
        messages={messages}
      />
    </section>
  );
}
