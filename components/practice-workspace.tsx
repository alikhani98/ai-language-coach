"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, BookOpenText, MessageSquareText, BookText, Mic, LoaderCircle } from "lucide-react";
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
const sectionIcons = [BookOpenText, MessageSquareText, BookText, Mic];

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
      <section className="section-surface py-8 sm:py-10">
        <div className="max-w-xl space-y-3">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sparkles className="h-6 w-6" /></span>
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
          <Button type="submit" className="w-full sm:w-auto" disabled={isGenerating}>
            {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isGenerating
              ? messages.practice.generating
              : messages.practice.generateButton}
          </Button>
        </form>
      </section>
    );
  }

  if (lesson.generation_status === "pending") {
    return (
      <section className="section-surface" aria-live="polite">
        <LoaderCircle className="mb-5 h-6 w-6 animate-spin text-primary" />
        <h1 className="text-2xl font-semibold">
          {messages.practice.pendingTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {messages.practice.pendingBody}
        </p>
        {error ? <StatusMessage tone="error" message={error} /> : null}
      </section>
    );
  }

  if (lesson.generation_status === "failed") {
    return (
      <section className="section-surface">
        <h1 className="text-2xl font-semibold">
          {messages.practice.failedTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {messages.practice.failedBody}
        </p>
        {error ? <StatusMessage tone="error" message={error} /> : null}
        <form action={generateAction} className="mt-6">
          <Button type="submit" disabled={isGenerating}>
            <Sparkles className="h-4 w-4" />
            {isGenerating
              ? messages.practice.retrying
              : messages.practice.retryButton}
          </Button>
        </form>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="section-surface p-4 sm:p-6">
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
              <Check className="me-2 h-4 w-4" />
              {messages.common.completed}
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {messages.practice.sections.map((item, index) => {
            const Icon = sectionIcons[index];
            return (
            <button
              key={item}
              type="button"
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                index === step && "bg-primary/10 text-primary ring-1 ring-primary/25",
              )}
              aria-pressed={index === step}
              onClick={() => setStep(index)}
            >
              <Icon className="h-4 w-4 shrink-0" />{item}
            </button>
          );})}
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
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {messages.common.back}
          </Button>
          <div className="flex justify-end gap-3">
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
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            ) : (
              <form action={finishAction}>
                <Button type="submit" disabled={isFinishing || lesson.completed}>
                  <Check className="h-4 w-4" />
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
      </section>
    </div>
  );
}

function Vocabulary({ lesson }: { lesson: DailyLesson }) {
  return (
    <div dir="ltr" className="grid gap-4 text-left sm:grid-cols-2">
      {lesson.words.map((item) => (
        <Card key={item.word} className="p-5">
          <h2 className="text-xl font-semibold text-primary">{item.word}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{item.meaning}</p>
          <p className="mt-4 border-t pt-4 text-sm leading-7">{item.example}</p>
        </Card>
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
    <div className="border-s-2 border-primary/40 py-3 ps-5 sm:ps-8">
      <p dir="ltr" className="text-left text-2xl font-medium leading-relaxed">{lesson.sentence}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        {messages.practice.sentenceHint}
      </p>
    </div>
  );
}

function Reading({ lesson }: { lesson: DailyLesson }) {
  return (
    <article dir="ltr" className="max-w-2xl py-3 text-left">
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
    <div className="border-s-2 border-primary/40 py-3 ps-5 sm:ps-8">
      <p dir="ltr" className="text-left text-xl font-medium leading-8">{lesson.speaking_task}</p>
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
      role={tone === "error" ? "alert" : "status"}
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
