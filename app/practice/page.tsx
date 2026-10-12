import { requireProfile } from "@/lib/actions/profile";
import { getTodaysLesson } from "@/lib/actions/dailyLesson";
import { PracticeWorkspace } from "@/components/practice-workspace";
import { getMessages } from "@/lib/i18n/config";
import { PageHeader } from "@/components/ui/page-header";

export default async function PracticePage() {
  const profile = await requireProfile();
  const lesson = await getTodaysLesson();
  const messages = getMessages(profile.interface_language);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={messages.practice.eyebrow}
        title={messages.practice.heading}
        description={messages.practice.body}
      />
      <PracticeWorkspace
        initialLesson={lesson}
        dailyMinutes={profile.daily_minutes}
        messages={messages}
      />
    </section>
  );
}
