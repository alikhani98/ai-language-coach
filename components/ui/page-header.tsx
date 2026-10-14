import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-8",
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl space-y-4">
        {eyebrow ? (
          <p className="text-xs font-semibold text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="type-title text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="max-w-xl text-sm type-copy text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
