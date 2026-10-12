import { requireProfile } from "@/lib/actions/profile";
import {
  getConversation,
  listRecentConversations,
} from "@/lib/actions/conversation";
import { ConversationWorkspace } from "@/components/conversation-workspace";

type ConversationPageProps = {
  searchParams: Promise<{
    id?: string;
  }>;
};

export default async function ConversationPage({
  searchParams,
}: ConversationPageProps) {
  await requireProfile();
  const params = await searchParams;
  const [recentConversations, initialThread] = await Promise.all([
    listRecentConversations(),
    params.id ? getConversation(params.id) : Promise.resolve(null),
  ]);

  return (
    <section className="space-y-6">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          AI Conversation Coach
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Practice a short English conversation.
        </h1>
        <p className="text-muted-foreground">
          Pick a topic, send a message, and get a concise reply with useful
          corrections when they matter.
        </p>
      </div>
      <ConversationWorkspace
        initialThread={initialThread}
        recentConversations={recentConversations}
      />
    </section>
  );
}
