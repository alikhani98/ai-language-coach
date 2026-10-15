import { getProfile } from "@/lib/actions/profile";
import { getMessages, resolveInterfaceLanguage } from "@/lib/i18n/config";
import { adminRead, type UserList as List } from "@/lib/admin/data";
import { UserList } from "@/components/admin/user-list";
import { Card } from "@/components/ui/card";
export default async function AdminPage() {
  const language = resolveInterfaceLanguage(await getProfile());
  const messages = getMessages(language);
  const m = messages.admin;
  const data = await adminRead<List>("admin_users", { p_status: "pending" });
  if (!data) return <p role="alert">{m.loadFailed}</p>;
  const counts = data.counts ?? {};
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ["total", Object.values(counts).reduce((a, b) => a + b, 0)],
            ["pending", counts.pending ?? 0],
            ["active", counts.active ?? 0],
            ["suspended", counts.suspended ?? 0],
          ] as const
        ).map(([label, count]) => (
          <Card key={label} className="space-y-3 p-5">
            <p className="text-sm text-muted-foreground">{m[label]}</p>
            <p className="type-title tabular-nums">
              {new Intl.NumberFormat(language).format(count)}
            </p>
          </Card>
        ))}
      </div>
      <section className="space-y-4">
        <h2 className="type-section">{m.pending}</h2>
        <p className="text-sm text-muted-foreground">{m.pendingDescription}</p>
        <UserList users={data.users} messages={messages} language={language} />
      </section>
    </div>
  );
}
