"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Check, MessageCircle, Send, Square } from "lucide-react";
import {
  endConversation,
  sendConversationMessage,
  startConversation,
} from "@/lib/actions/conversation";
import type {
  Conversation,
  ConversationMessage,
  ConversationThread,
} from "@/lib/conversation/model";
import {
  conversationTopics,
  type ConversationTopic,
} from "@/lib/validations/conversation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConversationWorkspaceProps = {
  initialThread: ConversationThread | null;
  recentConversations: Conversation[];
};

const topicLabels: Record<ConversationTopic, string> = {
  daily_life: "Daily Life",
  work: "Work",
  travel: "Travel",
  hobbies: "Hobbies",
  free_conversation: "Free Conversation",
};

export function ConversationWorkspace({
  initialThread,
  recentConversations,
}: ConversationWorkspaceProps) {
  const [topic, setTopic] = useState<ConversationTopic>("daily_life");
  const [text, setText] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [startState, startAction, isStarting] = useActionState(
    startConversation,
    { thread: initialThread },
  );
  const [sendState, sendAction, isSending] = useActionState(
    sendConversationMessage,
    { thread: initialThread },
  );
  const [endState, endAction, isEnding] = useActionState(endConversation, {
    thread: initialThread,
  });

  const thread =
    endState.thread ?? sendState.thread ?? startState.thread ?? initialThread;
  const messages = thread?.messages ?? [];
  const error = endState.error ?? sendState.error ?? startState.error;
  const success = endState.success ?? sendState.success ?? startState.success;
  const isEnded = thread?.conversation.status === "ended";

  useEffect(() => {
    if (sendState.success) {
      setText("");
      setRequestId(crypto.randomUUID());
    }
  }, [sendState.success]);

  const canSend = useMemo(
    () => Boolean(thread && !isEnded && text.trim() && !isSending),
    [thread, isEnded, text, isSending],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.4fr]">
      <aside className="space-y-5">
        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Start a conversation</h2>
          <form action={startAction} className="mt-4 space-y-4">
            <input type="hidden" name="topic" value={topic} />
            <div className="grid gap-2">
              {conversationTopics.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cn(
                    "flex min-h-11 items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm font-medium transition-colors hover:border-primary",
                    topic === item && "border-primary bg-accent",
                  )}
                  onClick={() => setTopic(item)}
                >
                  {topicLabels[item]}
                  {topic === item ? <Check className="h-4 w-4" /> : null}
                </button>
              ))}
            </div>
            <Button type="submit" className="w-full" disabled={isStarting}>
              <MessageCircle className="mr-2 h-4 w-4" />
              {isStarting ? "Starting" : "Start conversation"}
            </Button>
          </form>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Recent conversations</h2>
          <div className="mt-4 space-y-2">
            {recentConversations.length ? (
              recentConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/conversation?id=${conversation.id}`}
                  className={cn(
                    "block rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:border-primary",
                    thread?.conversation.id === conversation.id &&
                      "border-primary bg-accent",
                  )}
                >
                  <span className="font-medium">
                    {topicLabels[conversation.topic]}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {conversation.status === "ended" ? "Ended" : "Active"}
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No conversations yet.
              </p>
            )}
          </div>
        </section>
      </aside>

      <section className="rounded-lg border bg-card p-5">
        {thread ? (
          <ConversationPanel
            thread={thread}
            messages={messages}
            text={text}
            setText={setText}
            requestId={requestId}
            sendAction={sendAction}
            endAction={endAction}
            canSend={canSend}
            isSending={isSending}
            isEnding={isEnding}
            error={error}
            success={success}
          />
        ) : (
          <div className="flex min-h-96 items-center justify-center text-center">
            <div className="max-w-sm space-y-3">
              <MessageCircle className="mx-auto h-8 w-8 text-primary" />
              <h1 className="text-2xl font-semibold">
                Choose a topic to begin.
              </h1>
              <p className="text-muted-foreground">
                The coach will ask one question at a time and give small,
                useful corrections when needed.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ConversationPanel({
  thread,
  messages,
  text,
  setText,
  requestId,
  sendAction,
  endAction,
  canSend,
  isSending,
  isEnding,
  error,
  success,
}: {
  thread: ConversationThread;
  messages: ConversationMessage[];
  text: string;
  setText: (value: string) => void;
  requestId: string;
  sendAction: (payload: FormData) => void;
  endAction: (payload: FormData) => void;
  canSend: boolean;
  isSending: boolean;
  isEnding: boolean;
  error?: string;
  success?: string;
}) {
  const isEnded = thread.conversation.status === "ended";

  return (
    <div className="flex min-h-[34rem] flex-col">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Conversation Coach
          </p>
          <h1 className="text-2xl font-semibold">
            {topicLabels[thread.conversation.topic]}
          </h1>
        </div>
        <form action={endAction}>
          <input
            type="hidden"
            name="conversationId"
            value={thread.conversation.id}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={isEnded || isEnding}
          >
            <Square className="mr-2 h-4 w-4" />
            {isEnded ? "Ended" : isEnding ? "Ending" : "End"}
          </Button>
        </form>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto py-5">
        {messages.length ? (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        ) : (
          <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
            Send a short message. The coach will reply and correct up to two
            important mistakes.
          </div>
        )}
      </div>

      {success ? <StatusMessage tone="success" message={success} /> : null}
      {error ? <StatusMessage tone="error" message={error} /> : null}

      <form action={sendAction} className="mt-4 space-y-3 border-t pt-4">
        <input
          type="hidden"
          name="conversationId"
          value={thread.conversation.id}
        />
        <input type="hidden" name="requestId" value={requestId} />
        <textarea
          name="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={isEnded || isSending}
          maxLength={800}
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={
            isEnded
              ? "This conversation has ended."
              : "Write your reply in English..."
          }
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{text.length}/800</p>
          <Button type="submit" disabled={!canSend}>
            <Send className="mr-2 h-4 w-4" />
            {isSending ? "Sending" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg border p-4",
          isUser ? "bg-primary text-primary-foreground" : "bg-background",
        )}
      >
        <p className="whitespace-pre-line text-sm leading-6">{message.content}</p>
        {!isUser && message.corrections.length ? (
          <div className="mt-4 space-y-2">
            {message.corrections.map((correction) => (
              <div
                key={`${correction.original}-${correction.corrected}`}
                className="rounded-md border bg-card p-3 text-sm"
              >
                <p>
                  <span className="text-muted-foreground">Original:</span>{" "}
                  {correction.original}
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Better:</span>{" "}
                  {correction.corrected}
                </p>
                <p className="mt-2 text-muted-foreground">
                  {correction.explanation}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusMessage({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  return (
    <p
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        tone === "success" && "border-accent bg-accent text-accent-foreground",
        tone === "error" &&
          "border-destructive/25 bg-destructive/10 text-destructive",
      )}
    >
      {message}
    </p>
  );
}
