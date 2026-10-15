"use client";
import { useActionState } from "react";
import { changeUser } from "@/lib/actions/admin";
import { profileLevels, profileGoals } from "@/lib/validations/profile";
import { themePreferences } from "@/lib/theme/config";
import type { AdminUser } from "@/lib/admin/data";
import type { Messages } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function UserEditor({
  user,
  messages,
}: {
  user: AdminUser;
  messages: Messages;
}) {
  const [state, action, pending] = useActionState(changeUser, {});
  const m = messages.admin;
  const fields = {
    level: profileLevels.map((v) => [v, messages.onboarding.levels[v][0]]),
    goal: profileGoals.map((v) => [v, messages.onboarding.goals[v]]),
    daily_minutes: [10, 15, 30].map((v) => [
      String(v),
      messages.onboarding.minutes[String(v) as "10" | "15" | "30"],
    ]),
    interface_language: [
      ["en", messages.common.english],
      ["fa", messages.common.persian],
    ],
    theme_preference: themePreferences.map((v) => [v, messages.theme[v]]),
  };
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="target" value={user.user_id} />
      <input type="hidden" name="action" value="user_updated" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(fields).map(([name, options]) => (
          <label key={name} className="block text-sm font-medium">
            {m[name as keyof typeof fields]}
            <select
              required
              name={name}
              defaultValue={String(user[name as keyof typeof fields])}
              className="mt-2 h-11 w-full rounded-lg border bg-background px-3"
            >
              <option value="" disabled>
                {m.unknown}
              </option>
              {options.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="text-sm font-medium">
          {m.timezone}
          <Input
            className="mt-2"
            name="timezone"
            defaultValue={user.timezone}
            maxLength={100}
            required
            dir="ltr"
          />
        </label>
      </div>
      {state.result ? (
        <p
          role={state.result === "saved" ? "status" : "alert"}
          className="text-sm"
        >
          {m[state.result]}
        </p>
      ) : null}
      <Button disabled={pending}>
        {pending ? messages.common.saving : m.save}
      </Button>
    </form>
  );
}
