import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type MobileNavProps = {
  items: MobileNavItem[];
};

export function MobileNav({ items }: MobileNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_32px_hsl(var(--foreground)/0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
