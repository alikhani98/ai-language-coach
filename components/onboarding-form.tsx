"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { createProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProfileInput } from "@/lib/validations/profile";

type Option<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
};

const levelOptions: Option<ProfileInput["level"]>[] = [
  { value: "a1_beginner", label: "A1 Beginner", description: "Simple words and phrases." },
  { value: "a2_elementary", label: "A2 Elementary", description: "Everyday basics." },
  { value: "b1_intermediate", label: "B1 Intermediate", description: "Common conversations." },
  { value: "b2_upper_intermediate", label: "B2 Upper Intermediate", description: "Clear, confident expression." },
  { value: "c1_advanced", label: "C1 Advanced", description: "Nuanced, flexible English." },
];

const goalOptions: Option<ProfileInput["goal"]>[] = [
  { value: "conversation", label: "Conversation" },
  { value: "work", label: "Work" },
  { value: "travel", label: "Travel" },
  { value: "exam", label: "Exam" },
  { value: "personal_growth", label: "Personal Growth" },
];

const timeOptions: Option<ProfileInput["daily_minutes"]>[] = [
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
];

const steps = ["Level", "Goal", "Time"];

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(createProfile, {});
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<ProfileInput["level"]>("b1_intermediate");
  const [goal, setGoal] = useState<ProfileInput["goal"]>("conversation");
  const [dailyMinutes, setDailyMinutes] =
    useState<ProfileInput["daily_minutes"]>(15);
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  const canGoBack = step > 0;
  const isLastStep = step === steps.length - 1;
  const title = useMemo(() => {
    if (step === 0) return "What is your English level?";
    if (step === 1) return "What are you practicing for?";
    return "How much time feels realistic each day?";
  }, [step]);

  return (
    <div className="mx-auto max-w-2xl rounded-lg border bg-card p-5 sm:p-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Step {step + 1} of {steps.length}
        </p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="grid grid-cols-3 gap-2 pt-2">
          {steps.map((label, index) => (
            <div key={label} className="space-y-2">
              <div
                className={cn(
                  "h-1 rounded-full bg-muted",
                  index <= step && "bg-primary",
                )}
              />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {state.error ? (
        <p className="mt-5 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <form action={formAction} className="mt-6 space-y-6">
        <input type="hidden" name="level" value={level} />
        <input type="hidden" name="goal" value={goal} />
        <input type="hidden" name="daily_minutes" value={dailyMinutes} />
        <input type="hidden" name="timezone" value={timezone} />

        {step === 0 ? (
          <OptionGrid
            options={levelOptions}
            value={level}
            onChange={setLevel}
          />
        ) : null}

        {step === 1 ? (
          <OptionGrid options={goalOptions} value={goal} onChange={setGoal} />
        ) : null}

        {step === 2 ? (
          <OptionGrid
            options={timeOptions}
            value={dailyMinutes}
            onChange={setDailyMinutes}
          />
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t pt-5">
          <Button
            type="button"
            variant="outline"
            disabled={!canGoBack || isPending}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving" : "Start practice"}
              <Check className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isPending}
              onClick={() =>
                setStep((current) => Math.min(steps.length - 1, current + 1))
              }
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

type OptionGridProps<T extends string | number> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

function OptionGrid<T extends string | number>({
  options,
  value,
  onChange,
}: OptionGridProps<T>) {
  return (
    <div className="grid gap-3">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "flex min-h-16 items-center justify-between gap-3 rounded-md border bg-background p-4 text-left transition-colors hover:border-primary",
              selected && "border-primary bg-accent",
            )}
            onClick={() => onChange(option.value)}
          >
            <span>
              <span className="block font-medium">{option.label}</span>
              {option.description ? (
                <span className="mt-1 block text-sm text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </span>
            {selected ? <Check className="h-5 w-5 text-primary" /> : null}
          </button>
        );
      })}
    </div>
  );
}
