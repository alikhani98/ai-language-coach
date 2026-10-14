import { loadLearnerContext } from "@/lib/learner/load";
import { learnerFocus } from "@/lib/learner/focus";
import { requireProfile } from "@/lib/actions/profile";
import { getTodaysLesson } from "@/lib/actions/dailyLesson";
import { PracticeWorkspace } from "@/components/practice-workspace";
import { getMessages } from "@/lib/i18n/config";
import { PageHeader } from "@/components/ui/page-header";

export default async function PracticePage() {
  const profile = await requireProfile();
  const lesson = await getTodaysLesson();
  const messages = getMessages(profile.interface_language);
  const learnerContext = await loadLearnerContext(profile);
  const focus = learnerFocus(learnerContext, messages);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={messages.practice.eyebrow}
        title={messages.practice.heading}
        description={messages.practice.body}
      />
      <p className="border-s-2 border-primary/30 ps-4 text-sm type-copy"><span className="font-semibold text-primary">{messages.intelligence.personalized}: </span>{focus}</p>
      <PracticeWorkspace
        initialLesson={lesson}
        dailyMinutes={profile.daily_minutes}
        language={profile.interface_language}
        messages={messages}
      />
    </section>
  );
}
