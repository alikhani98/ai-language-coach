import { BotMessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function CoachAvatar({ small = false }: { small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary",
        small ? "h-10 w-10 rounded-xl" : "h-14 w-14",
      )}
    >
      <BotMessageSquare className={small ? "h-6 w-6" : "h-8 w-8"} strokeWidth={1.5} />
      {!small ? (
        <span className="absolute -end-1 -top-1 rounded-full border-2 border-background bg-primary p-1 text-primary-foreground">
          <Sparkles className="h-2.5 w-2.5" />
        </span>
      ) : null}
    </span>
  );
}

type AICoachMessageProps = {
  name: string;
  label: string;
  message: string;
  advice?: string;
  className?: string;
};

export function AICoachMessage({ name, label, message, advice, className }: AICoachMessageProps) {
  return (
    <aside className={cn("flex items-start gap-4", className)}>
      <CoachAvatar />
      <div className="min-w-0 space-y-3">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold">{name}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </p>
        <p className="type-coach">{message}</p>
        {advice ? <p className="max-w-xl text-sm type-copy text-muted-foreground">{advice}</p> : null}
      </div>
    </aside>
  );
}
