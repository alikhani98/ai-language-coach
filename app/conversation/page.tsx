import { requireProfile } from "@/lib/actions/profile";
import {
  getConversation,
  listRecentConversations,
} from "@/lib/actions/conversation";
import { ConversationWorkspace } from "@/components/conversation-workspace";
import { getMessages } from "@/lib/i18n/config";

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
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          {messages.conversation.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          {messages.conversation.heading}
        </h1>
        <p className="text-muted-foreground">
          {messages.conversation.body}
        </p>
      </div>
      <ConversationWorkspace
        initialThread={initialThread}
        recentConversations={recentConversations}
        messages={messages}
      />
    </section>
  );
}
