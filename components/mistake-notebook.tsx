"use client";

import { useActionState } from "react";
import { RefreshCw, Trash2, BookOpenCheck, CheckCircle2, ChevronDown } from "lucide-react";
import {
  removeMistake,
  syncConversationCorrectionsAction,
} from "@/lib/actions/mistakes";
import type { Mistake, MistakeGroup } from "@/lib/mistakes/model";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/section-title";
import type { Messages } from "@/lib/i18n/config";
import { AICoachMessage } from "@/components/coach/AICoachMessage";

type MistakeNotebookProps = {
  mistakes: Mistake[];
  groups: MistakeGroup[];
  messages: Messages;
  language: string;
  timezone: string;
};

export function MistakeNotebook({
  mistakes,
  groups,
  messages,
  language,
  timezone,
}: MistakeNotebookProps) {
  const [syncState, syncAction, isSyncing] = useActionState(
    syncConversationCorrectionsAction,
    {},
  );
  const [removeState, removeAction, isRemoving] = useActionState(removeMistake, {});

  return (
    <div className="space-y-6">
      <AICoachMessage name={messages.coach.name} label={messages.coach.role} message={messages.coach.notebookMessage} />
      <section className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <h2 className="text-sm font-semibold">
            {messages.mistakes.conversationCorrections}
          </h2>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
            {messages.mistakes.syncBody}
          </p>
        </div>
        <form action={syncAction} className="shrink-0">
          <Button type="submit" variant="outline" disabled={isSyncing}>
            <RefreshCw className={isSyncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {isSyncing ? messages.common.syncing : messages.mistakes.sync}
          </Button>
        </form>
      </section>

      {syncState.success ? (
        <StatusMessage tone="success" message={syncState.success} />
      ) : null}
      {syncState.error ? (
        <StatusMessage tone="error" message={syncState.error} />
      ) : null}
      {removeState.success ? (
        <StatusMessage tone="success" message={removeState.success} />
      ) : null}
      {removeState.error ? (
        <StatusMessage tone="error" message={removeState.error} />
      ) : null}

      <details className="group border-b pb-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          {messages.mistakes.frequent}
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {groups.length ? (
            groups.slice(0, 6).map((group) => (
              <div key={group.key} className="rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{messages.coach.categories[group.category as keyof typeof messages.coach.categories] ?? group.category}</p>
                  <span className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat(language).format(group.count)}{" "}
                    {group.count === 1
                      ? messages.mistakes.time
                      : messages.mistakes.times}
                  </span>
                </div>
                <p className="mt-3 text-sm">
                  <span className="text-muted-foreground">
                    {messages.mistakes.original}
                  </span>{" "}
                  <bdi lang="en">{group.wrong_sentence}</bdi>
                </p>
                <p className="mt-1 text-sm">
                  <span className="text-muted-foreground">
                    {messages.mistakes.correct}
                  </span>{" "}
                  <bdi lang="en" className="font-medium text-primary">{group.correct_sentence}</bdi>
                </p>
              </div>
            ))
          ) : (
            <EmptyState icon={CheckCircle2} title={messages.mistakes.noRepeated} description={messages.dashboard.patternsHint} className="col-span-full border-y" />
          )}
        </div>
      </details>

      <section>
        <SectionTitle title={messages.mistakes.notebookEntries} />
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
          {mistakes.length ? (
            mistakes.map((mistake) => (
              <article
                key={mistake.id}
                className="rounded-xl border bg-card p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{messages.coach.lesson}</p>
                    <h3 className="mt-1 text-base font-semibold">{messages.coach.categories[mistake.category as keyof typeof messages.coach.categories] ?? mistake.category}</h3>
                  </div>
                  <form action={removeAction}>
                    <input type="hidden" name="mistakeId" value={mistake.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      title={messages.common.remove}
                      aria-label={messages.common.remove}
                      disabled={isRemoving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">{messages.mistakes.original}</p>
                    <p lang="en" dir="auto" className="text-sm type-copy text-muted-foreground line-through decoration-destructive/40">{mistake.wrong_sentence}</p>
                  </div>
                  <div className="border-s-2 border-primary/40 ps-3">
                    <p className="mb-1 text-xs text-primary">{messages.mistakes.correct}</p>
                    <p lang="en" dir="auto" className="text-base font-medium type-copy">{mistake.correct_sentence}</p>
                  </div>
                </div>
                <details className="group mt-5 border-t pt-2">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4" />{messages.coach.reviewLesson}</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-3 pb-3 pt-2">
                    <p className="text-xs font-semibold">{messages.coach.why}</p>
                    <p dir="auto" className="text-sm type-copy text-muted-foreground">{mistake.explanation}</p>
                    <p className="border-s-2 border-primary/30 ps-3 text-sm type-copy">{messages.coach.reviewHint}</p>
                  </div>
                </details>
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">{new Date(mistake.created_at).toLocaleDateString(language, { timeZone: timezone })}</p>
              </article>
            ))
          ) : (
            <EmptyState icon={BookOpenCheck} title={messages.mistakes.notebookEntries} description={messages.mistakes.noSaved} className="col-span-full border-y" />
          )}
        </div>
      </section>
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
      className={
        tone === "success"
          ? "rounded-md border border-accent bg-accent px-3 py-2 text-sm text-accent-foreground"
          : "rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      }
    >
      {message}
    </p>
  );
}
