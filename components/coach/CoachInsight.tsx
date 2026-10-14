import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CoachAvatar } from "@/components/coach/AICoachMessage";
import type { Messages } from "@/lib/i18n/config";

type CoachInsightProps = {
  category?: string;
  hasPractice: boolean;
  completed: boolean;
  messages: Messages;
};

export function CoachInsight({ category, hasPractice, completed, messages }: CoachInsightProps) {
  const categoryAdvice = category
    ? messages.coach.insightAdvice[category as keyof typeof messages.coach.insightAdvice]
    : undefined;
  const message = category
    ? categoryAdvice ?? messages.coach.insightSaved
    : completed
      ? messages.coach.insightCompleted
      : hasPractice
        ? messages.coach.insightReturning
        : messages.coach.insightFirst;
  const href = category
    ? `/mistakes?category=${encodeURIComponent(category)}`
    : "/conversation";

  return (
    <aside aria-labelledby="coach-insight-title" className="flex min-w-0 items-start gap-3">
      <CoachAvatar small />
      <div className="coach-insight-bubble min-w-0 flex-1 rounded-lg rounded-ss-none border bg-card p-4 sm:p-5">
        <h2 id="coach-insight-title" className="text-xs font-semibold text-primary">
          {messages.coach.insightTitle}
        </h2>
        <p className="mt-3 text-sm type-copy">{message}</p>
        <Link href={href} className="mt-2 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary">
          {category ? messages.coach.reviewLesson : messages.nav.conversation}
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>
    </aside>
  );
}
