import { cn } from "@/lib/utils";

type SectionTitleProps = {
  title: string;
  description?: string;
  className?: string;
};

export function SectionTitle({
  title,
  description,
  className,
}: SectionTitleProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="type-section">{title}</h2>
      {description ? (
        <p className="text-sm type-copy text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
