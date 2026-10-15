import { LearningSummary } from "@/components/admin/learning-summary";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/actions/profile";
import { getMessages, resolveInterfaceLanguage } from "@/lib/i18n/config";
import { requireAdmin } from "@/lib/admin/auth";
import { adminRead, type AdminUser } from "@/lib/admin/data";
import { targetSchema } from "@/lib/admin/model";
import { Card } from "@/components/ui/card";
import { UserActions } from "@/components/admin/user-actions";
import { UserEditor } from "@/components/admin/user-editor";
export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user: actor } = await requireAdmin();
  const language = resolveInterfaceLanguage(await getProfile());
  const messages = getMessages(language);
  const m = messages.admin;
  const parsed = targetSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await adminRead<AdminUser>("admin_user_detail", {
    p_target: parsed.data,
  });
  if (!user) return <p role="alert">{m.loadFailed}</p>;
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(language, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        }).format(new Date(value))
      : m.unknown;
  return (
    <div className="space-y-5">
      <Card className="space-y-5 p-5 sm:p-7">
        <h2 className="type-section">{m.details}</h2>
        <dl className="grid gap-5 sm:grid-cols-2">
          {[
            [m.email, user.email],
            [m.status, m[user.status]],
            [m.created, date(user.created_at)],
            [m.lastSignIn, date(user.last_sign_in_at)],
            [
              m.level,
              user.level
                ? messages.onboarding.levels[user.level]?.[0]
                : m.unknown,
            ],
            [
              m.goal,
              user.goal ? messages.onboarding.goals[user.goal] : m.unknown,
            ],
            [
              m.daily_minutes,
              new Intl.NumberFormat(language).format(user.daily_minutes),
            ],
            [m.timezone, user.timezone],
            [
              m.interface_language,
              user.interface_language === "fa"
                ? messages.common.persian
                : messages.common.english,
            ],
            [m.theme_preference, messages.theme[user.theme_preference]],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-all font-medium">
                <bdi>{value}</bdi>
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">{m.timeNote}</p>
        {actor.id !== user.user_id ? (
          <UserActions user={user} messages={messages} />
        ) : (
          <p className="text-sm text-muted-foreground">{m.self}</p>
        )}
      </Card>
      <LearningSummary
        snapshot={user.memory}
        messages={messages}
        language={language}
      />
      {actor.id !== user.user_id ? (
        <Card className="space-y-5 p-5 sm:p-7">
          <h2 className="type-section">{m.edit}</h2>
          <UserEditor user={user} messages={messages} />
        </Card>
      ) : null}
    </div>
  );
}
