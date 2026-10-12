"use client";

import { useActionState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  removeMistake,
  syncConversationCorrectionsAction,
} from "@/lib/actions/mistakes";
import type { Mistake, MistakeGroup } from "@/lib/mistakes/model";
import { Button } from "@/components/ui/button";

type MistakeNotebookProps = {
  mistakes: Mistake[];
  groups: MistakeGroup[];
};

export function MistakeNotebook({ mistakes, groups }: MistakeNotebookProps) {
  const [syncState, syncAction, isSyncing] = useActionState(
    syncConversationCorrectionsAction,
    {},
  );
  const [removeState, removeAction, isRemoving] = useActionState(removeMistake, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Conversation corrections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sync saved coach corrections into this notebook without calling AI
            again.
          </p>
        </div>
        <form action={syncAction}>
          <Button type="submit" variant="outline" disabled={isSyncing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isSyncing ? "Syncing" : "Sync corrections"}
          </Button>
        </form>
      </div>

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

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Frequent corrections</h2>
        <div className="mt-4 grid gap-3">
          {groups.length ? (
            groups.slice(0, 6).map((group) => (
              <div key={group.key} className="rounded-md border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{group.category}</p>
                  <span className="text-sm text-muted-foreground">
                    {group.count} {group.count === 1 ? "time" : "times"}
                  </span>
                </div>
                <p className="mt-3 text-sm">
                  <span className="text-muted-foreground">Original:</span>{" "}
                  {group.wrong_sentence}
                </p>
                <p className="mt-1 text-sm">
                  <span className="text-muted-foreground">Correct:</span>{" "}
                  {group.correct_sentence}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No repeated corrections yet.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Notebook entries</h2>
        <div className="mt-4 space-y-3">
          {mistakes.length ? (
            mistakes.map((mistake) => (
              <article
                key={mistake.id}
                className="rounded-md border bg-background p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Original:</span>{" "}
                      {mistake.wrong_sentence}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Correct:</span>{" "}
                      {mistake.correct_sentence}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {mistake.explanation}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md border px-2 py-1">
                        {mistake.category}
                      </span>
                      <span className="rounded-md border px-2 py-1">
                        {new Date(mistake.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <form action={removeAction}>
                    <input type="hidden" name="mistakeId" value={mistake.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      disabled={isRemoving}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </form>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No saved corrections yet. Conversation feedback can be synced here
              when it appears.
            </p>
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
