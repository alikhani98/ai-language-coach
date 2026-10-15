"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { changeUser } from "@/lib/actions/admin";
import { transitions, type Transition } from "@/lib/admin/model";
import type { AdminUser } from "@/lib/admin/data";
import type { Messages } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
export function UserActions({
  user,
  messages,
}: {
  user: AdminUser;
  messages: Messages;
}) {
  const m = messages.admin;
  const [state, action, pending] = useActionState(changeUser, {});
  const [selected, setSelected] = useState<Transition | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (state.result === "saved") {
      dialog.current?.close();
      setSelected(null);
    }
  }, [state]);
  const labels = {
    user_approved: m.approve,
    user_rejected: m.reject,
    user_suspended: m.suspend,
    user_reactivated: m.reactivate,
  };
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(transitions) as Transition[])
        .filter((key) => transitions[key][0] === user.status)
        .map((key) => (
          <Button
            key={key}
            variant={key === "user_approved" ? "default" : "outline"}
            onClick={() => {
              setSelected(key);
              dialog.current?.showModal();
            }}
          >
            {labels[key]}
          </Button>
        ))}
      {state.result === "saved" ? (
        <p role="status" className="w-full text-sm text-muted-foreground">
          {m.saved}
        </p>
      ) : null}
      <dialog
        ref={dialog}
        onClose={() => setSelected(null)}
        aria-labelledby={`confirm-${user.user_id}`}
        className="max-h-[90svh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-xl border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-black/50"
      >
        <h2 id={`confirm-${user.user_id}`} className="type-section">
          {m.confirm}
        </h2>
        <p className="my-4 text-sm text-muted-foreground">{m.confirmBody}</p>
        <p className="break-all font-medium">
          <bdi>{user.email}</bdi>
        </p>
        <form action={action} className="mt-5 space-y-4">
          <input type="hidden" name="target" value={user.user_id} />
          <input type="hidden" name="action" value={selected ?? ""} />
          {state.result && state.result !== "saved" ? (
            <p role="alert" className="text-sm text-destructive">
              {m[state.result]}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button disabled={pending}>
              {pending
                ? messages.common.pleaseWait
                : selected
                  ? labels[selected]
                  : m.confirm}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => dialog.current?.close()}
            >
              {m.cancel}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
