"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, FileClock, LayoutDashboard, Users } from "lucide-react";
import type { Messages } from "@/lib/i18n/config";

export function AdminNav({ messages }: { messages: Messages }) {
  const m = messages.admin;
  const pathname = usePathname();
  const items = [
    ["/admin", m.overview, LayoutDashboard],
    ["/admin/users", m.users, Users],
    ["/admin/users?status=pending", m.pending, Users],
    ["/admin/audit", m.audit, FileClock],
    ["/settings/ai", messages.aiSettings.title, Bot],
  ] as const;
  return (
    <nav aria-label={m.title} className="flex flex-wrap gap-2 border-b pb-4">
      {items.map(([href, label, Icon]) => {
        const target = href.split("?")[0];
        const active = pathname === target || (target !== "/admin" && pathname.startsWith(`${target}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary/30 bg-primary/10 text-primary" : "border-transparent bg-secondary hover:bg-accent"}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
