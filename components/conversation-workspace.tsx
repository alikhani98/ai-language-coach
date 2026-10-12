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
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Messages } from "@/lib/i18n/config";

type ConversationWorkspaceProps = {
  initialThread: ConversationThread | null;
  recentConversations: Conversation[];
  messages: Messages;
};

export function ConversationWorkspace({
  initialThread,
  recentConversations,
  messages: ui,
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
  const threadMessages = thread?.messages ?? [];
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
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.4fr]">
      <aside className="space-y-5">
        <Card className="p-5">
          <h2 className="font-semibold">{ui.conversation.start}</h2>
          <form action={startAction} className="mt-4 space-y-4">
            <input type="hidden" name="topic" value={topic} />
            <div className="grid gap-2">
              {conversationTopics.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cn(
                    "flex min-h-12 items-center justify-between rounded-xl border bg-background px-3 py-2 text-left text-sm font-medium transition-colors hover:border-primary",
                    topic === item && "border-primary bg-accent",
                  )}
                  onClick={() => setTopic(item)}
                >
                  {ui.conversation.topics[item]}
                  {topic === item ? <Check className="h-4 w-4" /> : null}
                </button>
              ))}
            </div>
            <Button type="submit" className="w-full" disabled={isStarting}>
              <MessageCircle className="mr-2 h-4 w-4" />
              {isStarting
                ? ui.conversation.starting
                : ui.conversation.startButton}
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">{ui.conversation.recent}</h2>
          <div className="mt-4 space-y-2">
            {recentConversations.length ? (
              recentConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/conversation?id=${conversation.id}`}
                  className={cn(
                    "block rounded-xl border bg-background px-3 py-2 text-sm transition-colors hover:border-primary",
                    thread?.conversation.id === conversation.id &&
                      "border-primary bg-accent",
                  )}
                >
                  <span className="font-medium">
                    {ui.conversation.topics[conversation.topic]}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {conversation.status === "ended"
                      ? ui.conversation.ended
                      : ui.conversation.active}
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {ui.conversation.noRecent}
              </p>
            )}
          </div>
        </Card>
      </aside>

      <Card className="p-4 sm:p-5">
        {thread ? (
          <ConversationPanel
            thread={thread}
            threadMessages={threadMessages}
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
            messages={ui}
          />
        ) : (
          <div className="flex min-h-96 items-center justify-center">
            <EmptyState
              icon={MessageCircle}
              title={ui.conversation.emptyTitle}
              description={ui.conversation.emptyBody}
              className="max-w-sm"
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function ConversationPanel({
  thread,
  threadMessages,
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
  messages,
}: {
  thread: ConversationThread;
  threadMessages: ConversationMessage[];
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
  messages: Messages;
}) {
  const isEnded = thread.conversation.status === "ended";

  return (
    <div className="flex min-h-[34rem] flex-col">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {messages.conversation.coach}
          </p>
          <h1 className="text-2xl font-semibold">
            {messages.conversation.topics[thread.conversation.topic]}
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
            {isEnded
              ? messages.conversation.ended
              : isEnding
                ? messages.conversation.ending
                : messages.conversation.end}
          </Button>
        </form>
      </div>

      <div className="max-h-[58vh] flex-1 space-y-4 overflow-y-auto py-5 pr-1 rtl:pl-1 rtl:pr-0">
        {threadMessages.length ? (
          threadMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              messages={messages}
            />
          ))
        ) : (
          <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
            {messages.conversation.sendHint}
          </div>
        )}
        {isSending ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm rtl:rounded-bl-2xl rtl:rounded-br-md">
              {messages.conversation.typing}
            </div>
          </div>
        ) : null}
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
          className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-base outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          placeholder={
            isEnded
              ? messages.conversation.endedPlaceholder
              : messages.conversation.replyPlaceholder
          }
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{text.length}/800</p>
          <Button type="submit" disabled={!canSend}>
            <Send className="mr-2 h-4 w-4" />
            {isSending ? messages.conversation.sending : messages.conversation.send}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  messages,
}: {
  message: ConversationMessage;
  messages: Messages;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl border p-4 shadow-sm",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground rtl:rounded-bl-md rtl:rounded-br-2xl"
            : "rounded-bl-md bg-background rtl:rounded-bl-2xl rtl:rounded-br-md",
        )}
      >
        <p className="whitespace-pre-line text-sm leading-6">{message.content}</p>
        {!isUser && message.corrections.length ? (
          <div className="mt-4 space-y-2">
            {message.corrections.map((correction) => (
              <div
                key={`${correction.original}-${correction.corrected}`}
                className="rounded-xl border bg-card p-3 text-sm"
              >
                <p>
                  <span className="text-muted-foreground">
                    {messages.conversation.original}
                  </span>{" "}
                  {correction.original}
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">
                    {messages.conversation.better}
                  </span>{" "}
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
