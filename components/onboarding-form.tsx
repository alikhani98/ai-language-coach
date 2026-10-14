"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { createProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import type { ProfileInput } from "@/lib/validations/profile";
import { getMessages, type InterfaceLanguage } from "@/lib/i18n/config";

type Option<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
};

const levelValues: ProfileInput["level"][] = [
  "a1_beginner",
  "a2_elementary",
  "b1_intermediate",
  "b2_upper_intermediate",
  "c1_advanced",
];
const goalValues: ProfileInput["goal"][] = [
  "conversation",
  "work",
  "travel",
  "exam",
  "personal_growth",
];
const timeValues: ProfileInput["daily_minutes"][] = [10, 15, 30];
const languageOptions: Option<InterfaceLanguage>[] = [
  { value: "fa", label: "فارسی" },
  { value: "en", label: "English" },
];

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(createProfile, {});
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<ProfileInput["level"]>("b1_intermediate");
  const [goal, setGoal] = useState<ProfileInput["goal"]>("conversation");
  const [dailyMinutes, setDailyMinutes] =
    useState<ProfileInput["daily_minutes"]>(15);
  const [interfaceLanguage, setInterfaceLanguage] =
    useState<InterfaceLanguage>("en");
  const [timezone, setTimezone] = useState("UTC");
  const messages = getMessages(interfaceLanguage);
  const steps = useMemo(
    () => [
      messages.onboarding.steps.level,
      messages.onboarding.steps.goal,
      messages.onboarding.steps.time,
      messages.onboarding.steps.language,
    ],
    [messages],
  );
  const levelOptions = useMemo<Option<ProfileInput["level"]>[]>(
    () =>
      levelValues.map((value) => {
        const [label, description] = messages.onboarding.levels[value];
        return { value, label, description };
      }),
    [messages],
  );
  const goalOptions = useMemo<Option<ProfileInput["goal"]>[]>(
    () =>
      goalValues.map((value) => ({
        value,
        label: messages.onboarding.goals[value],
      })),
    [messages],
  );
  const timeOptions = useMemo<Option<ProfileInput["daily_minutes"]>[]>(
    () =>
      timeValues.map((value) => ({
        value,
        label: messages.onboarding.minutes[String(value) as "10" | "15" | "30"],
      })),
    [messages],
  );

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  const canGoBack = step > 0;
  const isLastStep = step === steps.length - 1;
  const title = useMemo(() => {
    if (step === 0) return messages.onboarding.levelTitle;
    if (step === 1) return messages.onboarding.goalTitle;
    if (step === 2) return messages.onboarding.timeTitle;
    return messages.onboarding.languageTitle;
  }, [messages, step]);

  return (
    <section lang={interfaceLanguage} dir={interfaceLanguage === "fa" ? "rtl" : "ltr"} className="space-y-6">
      <PageHeader
        eyebrow={messages.onboarding.eyebrow}
        title={messages.onboarding.heading}
        description={messages.onboarding.body}
        className="mx-auto max-w-2xl"
      />
      <Card className="mx-auto max-w-2xl p-5 sm:p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {messages.onboarding.step
              .replace("{current}", new Intl.NumberFormat(interfaceLanguage).format(step + 1))
              .replace("{total}", new Intl.NumberFormat(interfaceLanguage).format(steps.length))}
          </p>
          <h1 className="type-title">{title}</h1>
          <div className="grid grid-cols-4 gap-2 pt-2">
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
          <p role="alert" className="mt-5 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <form action={formAction} className="mt-6 space-y-6">
          <input type="hidden" name="level" value={level} />
          <input type="hidden" name="goal" value={goal} />
          <input type="hidden" name="daily_minutes" value={dailyMinutes} />
          <input type="hidden" name="timezone" value={timezone} />
          <input
            type="hidden"
            name="interface_language"
            value={interfaceLanguage}
          />

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

          {step === 3 ? (
            <OptionGrid
              options={languageOptions}
              value={interfaceLanguage}
              onChange={setInterfaceLanguage}
            />
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={!canGoBack || isPending}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {messages.common.back}
            </Button>

            {isLastStep ? (
              <Button type="submit" disabled={isPending}>
                {isPending ? messages.common.saving : messages.onboarding.startPractice}
                <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  setStep((current) => Math.min(steps.length - 1, current + 1))
                }
              >
                {messages.common.continue}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            )}
          </div>
        </form>
      </Card>
    </section>
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
              "flex min-h-16 items-center justify-between gap-3 rounded-lg border bg-background p-4 text-start transition-colors hover:border-primary/60",
              selected && "border-primary bg-primary/5 ring-1 ring-primary/20",
            )}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
          >
            <span>
              <bdi className="block font-medium">{option.label}</bdi>
              {option.description ? (
                <span className="mt-1 block text-sm text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </span>
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", selected && "border-primary bg-primary text-primary-foreground")}>
              {selected ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
