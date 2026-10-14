"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, MessageCircle, BarChart3, BookOpenText, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileNavItem = {
  href: string;
  label: string;
};

type MobileNavProps = {
  items: MobileNavItem[];
};

const icons: Record<string, LucideIcon> = {
  "/dashboard": Home,
  "/practice": Sparkles,
  "/conversation": MessageCircle,
  "/progress": BarChart3,
  "/mistakes": BookOpenText,
};

export function NavigationLinks({ items, mobile = false }: MobileNavProps & { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <div className={mobile ? "mx-auto grid max-w-lg grid-cols-4 gap-1" : "flex items-center gap-1"}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = icons[item.href] ?? BookOpenText;
          return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-center rounded-lg font-medium transition-colors hover:bg-secondary hover:text-foreground",
              mobile ? "min-h-14 flex-col gap-1 px-1 py-1.5 text-xs" : "min-h-11 gap-2 px-3 text-sm",
              active ? "bg-secondary text-primary" : "text-muted-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" className={cn("h-5 w-5 shrink-0", active && "stroke-[2.5]")} />
            <span className="nav-label max-w-full">{item.label}</span>
          </Link>
          );
        })}
    </div>
  );
}

export function MobileNav({ items }: MobileNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_24px_hsl(var(--foreground)/0.04)] backdrop-blur-lg md:hidden">
      <NavigationLinks items={items} mobile />
    </nav>
  );
}
