import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getProfile } from "@/lib/actions/profile";
import { getMessages } from "@/lib/i18n/config";
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
      <nav aria-label={m.title} className="flex flex-wrap gap-2 border-b pb-4">
        {[
          ["/admin", m.overview],
          ["/admin/users", m.users],
          ["/admin/users?status=pending", m.pending],
          ["/admin/audit", m.audit],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="inline-flex min-h-11 items-center rounded-lg bg-secondary px-4 text-sm font-medium hover:bg-accent"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
