"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import {
  finishTodaysLesson,
  generateTodaysLesson,
} from "@/lib/actions/dailyLesson";
import type { DailyLesson } from "@/lib/daily/lesson";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatMessage, type Messages } from "@/lib/i18n/config";

type PracticeWorkspaceProps = {
  initialLesson: DailyLesson | null;
  dailyMinutes: number;
  messages: Messages;
};

const sectionKeys = ["vocabulary", "sentence", "reading", "speaking"] as const;

export function PracticeWorkspace({
  initialLesson,
  dailyMinutes,
  messages,
}: PracticeWorkspaceProps) {
  const [step, setStep] = useState(0);
  const [generateState, generateAction, isGenerating] = useActionState(
    generateTodaysLesson,
    { lesson: initialLesson },
  );
  const [finishState, finishAction, isFinishing] = useActionState(
    finishTodaysLesson,
    { lesson: initialLesson },
  );
  const lesson = finishState.lesson ?? generateState.lesson ?? initialLesson;
  const message = finishState.success ?? generateState.success;
  const error = finishState.error ?? generateState.error;
  const section = sectionKeys[step];

  const progressLabel = useMemo(
    () =>
      formatMessage(messages.practice.progressLabel, {
        current: step + 1,
        total: sectionKeys.length,
      }),
    [messages, step],
  );

  if (!lesson) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="max-w-xl space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {formatMessage(messages.practice.minutePractice, {
              minutes: dailyMinutes,
            })}
          </p>
          <h1 className="text-2xl font-semibold">
            {messages.practice.generateTitle}
          </h1>
          <p className="text-muted-foreground">
            {messages.practice.generateBody}
          </p>
        </div>
        {error ? <StatusMessage tone="error" message={error} /> : null}
        <form action={generateAction} className="mt-6">
          <Button type="submit" disabled={isGenerating}>
            <Sparkles className="mr-2 h-4 w-4" />
            {isGenerating
              ? messages.practice.generating
              : messages.practice.generateButton}
          </Button>
        </form>
      </Card>
    );
  }

  if (lesson.generation_status === "pending") {
    return (
      <Card className="p-5 sm:p-6">
        <h1 className="text-2xl font-semibold">
          {messages.practice.pendingTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {messages.practice.pendingBody}
        </p>
        {error ? <StatusMessage tone="error" message={error} /> : null}
      </Card>
    );
  }

  if (lesson.generation_status === "failed") {
    return (
      <Card className="p-5 sm:p-6">
        <h1 className="text-2xl font-semibold">
          {messages.practice.failedTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {messages.practice.failedBody}
        </p>
        {error ? <StatusMessage tone="error" message={error} /> : null}
        <form action={generateAction} className="mt-6">
          <Button type="submit" disabled={isGenerating}>
            <Sparkles className="mr-2 h-4 w-4" />
            {isGenerating
              ? messages.practice.retrying
              : messages.practice.retryButton}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {progressLabel} ·{" "}
              {formatMessage(messages.practice.minutePractice, {
                minutes: dailyMinutes,
              })}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              {messages.practice.sections[step]}
            </h1>
          </div>
          {lesson.completed ? (
            <span className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">
              <Check className="mr-2 h-4 w-4" />
              {messages.common.completed}
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {messages.practice.sections.map((item, index) => (
            <button
              key={item}
              type="button"
              className={cn(
                "min-h-11 rounded-xl border px-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
                index === step && "border-primary bg-accent text-accent-foreground",
              )}
              onClick={() => setStep(index)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-6 min-h-72">
          {section === "vocabulary" ? <Vocabulary lesson={lesson} /> : null}
          {section === "sentence" ? (
            <Sentence lesson={lesson} messages={messages} />
          ) : null}
          {section === "reading" ? <Reading lesson={lesson} /> : null}
          {section === "speaking" ? (
            <Speaking lesson={lesson} messages={messages} />
          ) : null}
        </div>

        {message ? <StatusMessage tone="success" message={message} /> : null}
        {error ? <StatusMessage tone="error" message={error} /> : null}

        <div className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {messages.common.back}
          </Button>
          <div className="flex gap-3">
            {step < sectionKeys.length - 1 ? (
              <Button
                type="button"
                onClick={() =>
                  setStep((current) =>
                    Math.min(sectionKeys.length - 1, current + 1),
                  )
                }
              >
                {messages.common.next}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <form action={finishAction}>
                <Button type="submit" disabled={isFinishing || lesson.completed}>
                  <Check className="mr-2 h-4 w-4" />
                  {lesson.completed
                    ? messages.practice.finished
                    : isFinishing
                      ? messages.practice.finishing
                      : messages.practice.finishPractice}
                </Button>
              </form>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Vocabulary({ lesson }: { lesson: DailyLesson }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {lesson.words.map((item) => (
        <div key={item.word} className="rounded-xl border bg-background p-4">
          <h2 className="text-lg font-semibold">{item.word}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{item.meaning}</p>
          <p className="mt-3 text-sm">{item.example}</p>
        </div>
      ))}
    </div>
  );
}

function Sentence({
  lesson,
  messages,
}: {
  lesson: DailyLesson;
  messages: Messages;
}) {
  return (
    <div className="rounded-xl border bg-background p-5">
      <p className="text-2xl font-semibold leading-relaxed">{lesson.sentence}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        {messages.practice.sentenceHint}
      </p>
    </div>
  );
}

function Reading({ lesson }: { lesson: DailyLesson }) {
  return (
    <article className="rounded-xl border bg-background p-5">
      <p className="whitespace-pre-line text-base leading-8">{lesson.reading_text}</p>
    </article>
  );
}

function Speaking({
  lesson,
  messages,
}: {
  lesson: DailyLesson;
  messages: Messages;
}) {
  return (
    <div className="rounded-xl border bg-background p-5">
      <p className="text-xl font-medium leading-8">{lesson.speaking_task}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        {messages.practice.speakingHint}
      </p>
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
        "mt-5 rounded-md border px-3 py-2 text-sm",
        tone === "success" && "border-accent bg-accent text-accent-foreground",
        tone === "error" &&
          "border-destructive/25 bg-destructive/10 text-destructive",
      )}
    >
      {message}
    </p>
  );
}
