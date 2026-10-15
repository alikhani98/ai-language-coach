import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Messages, InterfaceLanguage } from "@/lib/i18n/config";
import type { AdminUser } from "@/lib/admin/data";
import { UserActions } from "@/components/admin/user-actions";
export function UserList({
  users,
  messages,
  language,
}: {
  users: AdminUser[];
  messages: Messages;
  language: InterfaceLanguage;
}) {
  const m = messages.admin;
  if (!users.length)
    return <Card className="p-8 text-muted-foreground">{m.empty}</Card>;
  return (
    <div className="grid gap-3">
      {users.map((user) => (
        <Card
          key={user.user_id}
          className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
        >
          <div className="min-w-0 space-y-3">
            <Link
              className="block break-all font-medium text-primary underline-offset-4 hover:underline"
              href={`/admin/users/${user.user_id}`}
            >
              <bdi>{user.email}</bdi>
            </Link>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full bg-secondary px-3 py-1 font-medium text-foreground">
                {m[user.status]}
              </span>
              <span>
                {m.created}:{" "}
                {new Intl.DateTimeFormat(language, {
                  dateStyle: "medium",
                  timeZone: "UTC",
                }).format(new Date(user.created_at))}
              </span>
              <span>
                {user.level
                  ? messages.onboarding.levels[user.level]?.[0]
                  : m.unknown}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/users/${user.user_id}`}
              className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-primary"
            >
              {m.view}
            </Link>
            <UserActions user={user} messages={messages} />
          </div>
        </Card>
      ))}
    </div>
  );
}
export function Pagination({
  page,
  total,
  base,
  messages,
  language,
}: {
  page: number;
  total: number;
  base: string;
  messages: Messages;
  language: InterfaceLanguage;
}) {
  const m = messages.admin;
  const href = (n: number) =>
    `${base}${base.includes("?") ? "&" : "?"}page=${n}`;
  return (
    <nav
      aria-label={m.page}
      className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
    >
      <span>
        {m.page} {new Intl.NumberFormat(language).format(page)}
      </span>
      <div className="flex gap-3">
        {page > 1 ? (
          <Link
            className="inline-flex min-h-11 items-center rounded-lg border px-4"
            href={href(page - 1)}
          >
            {m.previous}
          </Link>
        ) : null}
        {page * 25 < total ? (
          <Link
            className="inline-flex min-h-11 items-center rounded-lg border px-4"
            href={href(page + 1)}
          >
            {m.next}
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
