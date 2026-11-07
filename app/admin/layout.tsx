import { requireAdmin } from "@/lib/admin/auth";
import { getProfile } from "@/lib/actions/profile";
import { getMessages } from "@/lib/i18n/config";
import { AdminNav } from "@/components/admin/admin-nav";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const m = getMessages((await getProfile())?.interface_language).admin;
  return (
    <div className="space-y-7">
      <header className="space-y-3">
        <h1 className="type-title">{m.title}</h1>
        <p className="text-muted-foreground">{m.description}</p>
      </header>
      <AdminNav messages={getMessages((await getProfile())?.interface_language)} />
      {children}
    </div>
  );
}
