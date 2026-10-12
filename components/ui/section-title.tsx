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
    <div className={cn("space-y-1", className)}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
