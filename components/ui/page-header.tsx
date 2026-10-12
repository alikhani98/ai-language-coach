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
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl space-y-2">
        {eyebrow ? (
          <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="text-base leading-7 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
