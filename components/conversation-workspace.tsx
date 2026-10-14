"use client";

import { AIProgressSummary } from "@/components/coach/AIProgressSummary";
import { parseStoredSummary, fallbackProgressSummary } from "@/lib/learner/summary";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MessageCircle, Send, Square, LoaderCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { Messages } from "@/lib/i18n/config";
import { AICoachMessage, CoachAvatar } from "@/components/coach/AICoachMessage";

type ConversationWorkspaceProps = {
  initialThread: ConversationThread | null;
  recentConversations: Conversation[];
  messages: Messages;
  language: string;
};

export function ConversationWorkspace({
  initialThread,
  recentConversations,
  language,
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
    <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className={cn("min-w-0 space-y-6", thread && "order-2 lg:order-none")}>
        <section className="border-b pb-6">
          <h2 className="font-semibold">{ui.conversation.start}</h2>
          <form action={startAction} className="mt-4 space-y-4">
            <input type="hidden" name="topic" value={topic} />
            <div className="grid gap-2">
              {conversationTopics.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cn(
                    "flex min-h-12 items-center justify-between gap-2 rounded-lg px-4 py-3 text-start text-sm font-medium transition-colors hover:bg-secondary",
                    topic === item ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "text-muted-foreground",
                  )}
                  aria-pressed={topic === item}
                  onClick={() => setTopic(item)}
                >
                  {ui.conversation.topics[item]}
                  <Check className={cn("h-4 w-4 shrink-0", topic !== item && "invisible")} />
                </button>
              ))}
            </div>
            <Button type="submit" className="w-full" disabled={isStarting}>
              {isStarting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              {isStarting
                ? ui.conversation.starting
                : ui.conversation.startButton}
            </Button>
          </form>
        </section>

        <section>
          <h2 className="font-semibold">{ui.conversation.recent}</h2>
          <div className="mt-4 space-y-2">
            {recentConversations.length ? (
              recentConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/conversation?id=${conversation.id}`}
                  className={cn(
                    "block rounded-lg border-s-2 border-transparent px-4 py-3 text-sm transition-colors hover:bg-secondary",
                    thread?.conversation.id === conversation.id &&
                      "border-primary bg-secondary",
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
        </section>
      </aside>

      <Card className="min-w-0 overflow-hidden p-4 sm:p-6">
        {isEnded && thread ? <AIProgressSummary messages={ui} summary={parseStoredSummary(thread.conversation.feedback) ?? fallbackProgressSummary({ activity: "conversation", words: [], exchanges: threadMessages.filter((item) => item.role === "assistant").length, corrections: threadMessages.flatMap((item) => item.corrections) }, language)} /> : null}
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
          <div className="flex min-h-72 flex-col justify-center gap-6 px-1 sm:px-4">
            <AICoachMessage name={ui.coach.name} label={ui.coach.role} message={ui.conversation.emptyTitle} advice={ui.conversation.emptyBody} />
            <p className="border-s-2 border-primary/25 ps-4 text-sm leading-7 text-muted-foreground">{ui.coach.conversationObjective}</p>
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = scrollRef.current;
    if (!panel) return;

    const messages = panel.querySelectorAll<HTMLElement>("[data-chat-message]");
    const latest = messages.item(messages.length - 1);
    // Keep the tutor's reply visible when its corrections exceed the viewport.
    if (!isSending && latest && latest.offsetHeight > panel.clientHeight) {
      panel.scrollTop += latest.getBoundingClientRect().top - panel.getBoundingClientRect().top - 20;
    } else {
      panel.scrollTop = panel.scrollHeight;
    }
  }, [threadMessages.length, isSending]);

  return (
    <div className="flex min-h-[min(32rem,70svh)] min-w-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <CoachAvatar small />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{messages.coach.name}<span className="ms-2 text-xs font-normal text-muted-foreground">{messages.conversation.coach}</span></p>
            <h2 className="mt-1 text-sm font-medium text-primary">{messages.conversation.topics[thread.conversation.topic]}</h2>
          </div>
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
            size="sm"
            disabled={isEnded || isEnding}
          >
            <Square className="h-3.5 w-3.5" />
            {isEnded
              ? messages.conversation.ended
              : isEnding
                ? messages.conversation.ending
                : messages.conversation.end}
          </Button>
        </form>
      </div>
      <p className="border-b py-3 text-xs leading-6 text-muted-foreground">{messages.coach.conversationObjective}</p>

      <div ref={scrollRef} role="log" aria-label={messages.conversation.coach} aria-live="polite" className="h-[clamp(9rem,25svh,24rem)] flex-none space-y-5 overflow-y-auto overscroll-contain py-5 pe-1 sm:h-[52svh]">
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
            <div role="status" className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
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
          aria-label={messages.conversation.replyPlaceholder}
          dir="ltr"
          name="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={isEnded || isSending}
          maxLength={800}
          rows={2}
          className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-base leading-7 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          placeholder={
            isEnded
              ? messages.conversation.endedPlaceholder
              : messages.conversation.replyPlaceholder
          }
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{text.length}/800</p>
          <Button type="submit" disabled={!canSend}>
            {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}
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
    <div data-chat-message className={cn("flex items-start gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? <CoachAvatar small /> : null}
      <div
        className={cn(
          "min-w-0 rounded-xl p-4 sm:p-5",
          isUser
            ? "max-w-[90%] rounded-br-md bg-primary text-primary-foreground rtl:rounded-bl-md rtl:rounded-br-2xl"
            : "max-w-[calc(100%-3rem)] rounded-bl-md bg-muted/65 rtl:rounded-bl-2xl rtl:rounded-br-md",
        )}
      >
        <p dir="auto" className="whitespace-pre-line text-sm leading-7">{message.content}</p>
        {!isUser && message.corrections.length ? (
          <div className="mt-4 space-y-2">
            {message.corrections.map((correction) => (
              <aside
                key={`${correction.original}-${correction.corrected}`}
                className="border-t border-primary/20 pt-4 text-sm leading-7"
              >
                <p className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-primary">
                  <Check className="h-3.5 w-3.5" />{messages.coach.correctionTitle}
                  <span className="text-muted-foreground">· {messages.coach.categories[correction.category]}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    {messages.conversation.original}
                  </span>{" "}
                  <bdi className="text-muted-foreground line-through decoration-destructive/40">{correction.original}</bdi>
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">
                    {messages.conversation.better}
                  </span>{" "}
                  <bdi className="font-medium text-primary">{correction.corrected}</bdi>
                </p>
                <details className="group mt-2">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-primary [&::-webkit-details-marker]:hidden">
                    {messages.coach.why}<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p dir="auto" className="border-s-2 border-primary/30 ps-3 text-muted-foreground">{correction.explanation}</p>
                </details>
              </aside>
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
      role={tone === "error" ? "alert" : "status"}
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
