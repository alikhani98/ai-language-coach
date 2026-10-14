import { loadLearnerContext } from "@/lib/learner/load";
import { learnerFocus } from "@/lib/learner/focus";
import { requireProfile } from "@/lib/actions/profile";
import {
  getConversation,
  listRecentConversations,
} from "@/lib/actions/conversation";
import { ConversationWorkspace } from "@/components/conversation-workspace";
import { getMessages } from "@/lib/i18n/config";
import { PageHeader } from "@/components/ui/page-header";

type ConversationPageProps = {
  searchParams: Promise<{
    id?: string;
  }>;
};

export default async function ConversationPage({
  searchParams,
}: ConversationPageProps) {
  const profile = await requireProfile();
  const params = await searchParams;
  const [recentConversations, initialThread] = await Promise.all([
    listRecentConversations(),
    params.id ? getConversation(params.id) : Promise.resolve(null),
  ]);
  const messages = getMessages(profile.interface_language);
  const learnerContext = await loadLearnerContext(profile);
  const focus = learnerFocus(learnerContext, messages);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={messages.conversation.eyebrow}
        title={messages.nav.conversation}
      />
      <p className="border-s-2 border-primary/30 ps-4 text-sm leading-7"><span className="font-semibold text-primary">{messages.intelligence.coachFocus}: </span>{focus}</p>
      <ConversationWorkspace
        initialThread={initialThread}
        recentConversations={recentConversations}
        language={profile.interface_language}
        messages={messages}
      />
    </section>
  );
}
