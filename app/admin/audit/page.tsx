import { getProfile } from "@/lib/actions/profile";
import { getMessages, resolveInterfaceLanguage } from "@/lib/i18n/config";
import { adminRead, type AuditList } from "@/lib/admin/data";
import { userFiltersSchema } from "@/lib/admin/model";
import { Pagination } from "@/components/admin/user-list";
import { Card } from "@/components/ui/card";
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const language = resolveInterfaceLanguage(await getProfile());
  const messages = getMessages(language);
  const m = messages.admin;
  const parsed = userFiltersSchema.safeParse(await searchParams);
  if (!parsed.success) return <p role="alert">{m.invalid}</p>;
  const data = await adminRead<AuditList>("admin_audit", {
    p_page: parsed.data.page,
  });
  if (!data) return <p role="alert">{m.loadFailed}</p>;
  return (
    <section className="space-y-4">
      <h2 className="type-section">{m.audit}</h2>
      <p className="text-xs text-muted-foreground">{m.timeNote}</p>
      {!data.logs.length ? (
        <Card className="p-8 text-muted-foreground">{m.auditEmpty}</Card>
      ) : (
        data.logs.map((log) => (
          <Card key={log.id} className="space-y-3 p-5">
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-medium">{m[log.action]}</h3>
              <time
                dateTime={log.created_at}
                className="text-sm text-muted-foreground"
              >
                {new Intl.DateTimeFormat(language, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                }).format(new Date(log.created_at))}
              </time>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{m.actor}</dt>
                <dd className="break-all">
                  <bdi>{log.admin_user_id ?? m.unknown}</bdi>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{m.target}</dt>
                <dd className="break-all">
                  <bdi>{log.target_user_id ?? m.unknown}</bdi>
                </dd>
              </div>
            </dl>
          </Card>
        ))
      )}
      <Pagination
        page={parsed.data.page}
        total={data.total}
        base="/admin/audit"
        messages={messages}
        language={language}
      />
    </section>
  );
}
