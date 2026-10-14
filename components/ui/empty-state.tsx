import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("px-4 py-10 text-center", className)}>
      {Icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <h2 className="type-section">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm type-copy text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
