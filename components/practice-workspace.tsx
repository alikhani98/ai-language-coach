"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import {
  finishTodaysLesson,
  generateTodaysLesson,
} from "@/lib/actions/dailyLesson";
import type { DailyLesson } from "@/lib/daily/lesson";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PracticeWorkspaceProps = {
  initialLesson: DailyLesson | null;
  dailyMinutes: number;
};

const sections = ["Vocabulary", "Sentence", "Reading", "Speaking"] as const;

export function PracticeWorkspace({
  initialLesson,
  dailyMinutes,
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
  const section = sections[step];

  const progressLabel = useMemo(
    () => `${step + 1} of ${sections.length}`,
    [step],
  );

  if (!lesson) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="max-w-xl space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {dailyMinutes} minute practice
          </p>
          <h1 className="text-2xl font-semibold">
            Generate today&apos;s focused lesson.
          </h1>
          <p className="text-muted-foreground">
            Your lesson is created once for your local calendar day and reused
            for review after you finish.
          </p>
        </div>
        {error ? <StatusMessage tone="error" message={error} /> : null}
        <form action={generateAction} className="mt-6">
          <Button type="submit" disabled={isGenerating}>
            <Sparkles className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating" : "Generate Today's Practice"}
          </Button>
        </form>
      </div>
    );
  }

  if (lesson.generation_status === "pending") {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-2xl font-semibold">Today&apos;s lesson is coming.</h1>
        <p className="mt-3 text-muted-foreground">
          Generation is already in progress. Refresh in a moment to see the
          finished practice.
        </p>
        {error ? <StatusMessage tone="error" message={error} /> : null}
      </div>
    );
  }

  if (lesson.generation_status === "failed") {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-2xl font-semibold">Generation did not finish.</h1>
        <p className="mt-3 text-muted-foreground">
          The coach could not create today&apos;s lesson. You can try again.
        </p>
        {error ? <StatusMessage tone="error" message={error} /> : null}
        <form action={generateAction} className="mt-6">
          <Button type="submit" disabled={isGenerating}>
            <Sparkles className="mr-2 h-4 w-4" />
            {isGenerating ? "Retrying" : "Retry Generation"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {progressLabel} · {dailyMinutes} minute practice
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{section}</h1>
          </div>
          {lesson.completed ? (
            <span className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">
              <Check className="mr-2 h-4 w-4" />
              Completed
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {sections.map((item, index) => (
            <button
              key={item}
              type="button"
              className={cn(
                "h-10 rounded-md border text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
                index === step && "border-primary bg-accent text-accent-foreground",
              )}
              onClick={() => setStep(index)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-6 min-h-72">
          {section === "Vocabulary" ? <Vocabulary lesson={lesson} /> : null}
          {section === "Sentence" ? <Sentence lesson={lesson} /> : null}
          {section === "Reading" ? <Reading lesson={lesson} /> : null}
          {section === "Speaking" ? <Speaking lesson={lesson} /> : null}
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
            Back
          </Button>
          <div className="flex gap-3">
            {step < sections.length - 1 ? (
              <Button
                type="button"
                onClick={() =>
                  setStep((current) => Math.min(sections.length - 1, current + 1))
                }
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <form action={finishAction}>
                <Button type="submit" disabled={isFinishing || lesson.completed}>
                  <Check className="mr-2 h-4 w-4" />
                  {lesson.completed
                    ? "Finished"
                    : isFinishing
                      ? "Finishing"
                      : "Finish Practice"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Vocabulary({ lesson }: { lesson: DailyLesson }) {
  return (
    <div className="grid gap-3">
      {lesson.words.map((item) => (
        <div key={item.word} className="rounded-md border bg-background p-4">
          <h2 className="font-semibold">{item.word}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{item.meaning}</p>
          <p className="mt-3 text-sm">{item.example}</p>
        </div>
      ))}
    </div>
  );
}

function Sentence({ lesson }: { lesson: DailyLesson }) {
  return (
    <div className="rounded-md border bg-background p-5">
      <p className="text-xl font-medium leading-relaxed">{lesson.sentence}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        Read it slowly, then say it aloud three times with natural rhythm.
      </p>
    </div>
  );
}

function Reading({ lesson }: { lesson: DailyLesson }) {
  return (
    <article className="rounded-md border bg-background p-5">
      <p className="whitespace-pre-line leading-7">{lesson.reading_text}</p>
    </article>
  );
}

function Speaking({ lesson }: { lesson: DailyLesson }) {
  return (
    <div className="rounded-md border bg-background p-5">
      <p className="text-lg leading-7">{lesson.speaking_task}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        Speak aloud independently. This practice does not record audio or score
        pronunciation.
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
