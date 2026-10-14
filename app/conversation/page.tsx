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

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={messages.conversation.eyebrow}
        title={messages.nav.conversation}
      />
      <ConversationWorkspace
        initialThread={initialThread}
        recentConversations={recentConversations}
        messages={messages}
      />
    </section>
  );
}
