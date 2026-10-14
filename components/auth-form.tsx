"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BookOpenText, CheckCircle2, ArrowRight, LoaderCircle } from "lucide-react";
import { login, signup } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Messages } from "@/lib/i18n/config";

type AuthFormProps = {
  mode: "login" | "signup";
  message?: string;
  messages: Messages;
};

export function AuthForm({ mode, message, messages }: AuthFormProps) {
  const isLogin = mode === "login";
  const [state, formAction, isPending] = useActionState(
    isLogin ? login : signup,
    {},
  );

  return (
    <div className="mx-auto grid w-full max-w-5xl items-center gap-8 py-3 sm:py-10 lg:min-h-[calc(100svh-12rem)] lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
      <section className="space-y-6">
        <div className="space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <BookOpenText className="h-7 w-7" />
          </div>
          <div className="max-w-xl space-y-3">
            <h1 className="text-3xl font-semibold leading-snug sm:text-4xl">
              {messages.common.appName}
            </h1>
            <p className="text-xl font-medium leading-relaxed text-primary">{messages.auth.tagline}</p>
            <p className="max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
              {messages.auth.intro}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-3 border-t pt-5 lg:grid">
          {messages.auth.features.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 text-xs font-medium sm:text-sm"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </section>

      <Card className="p-6 shadow-[0_12px_40px_hsl(var(--foreground)/0.05)] sm:p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">
            {isLogin ? messages.auth.loginTitle : messages.auth.signupTitle}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {isLogin
              ? messages.auth.loginDescription
              : messages.auth.signupDescription}
          </p>
        </div>
        {message ? (
          <p className="mt-4 rounded-xl border border-accent bg-accent px-3 py-2 text-sm text-accent-foreground">
            {message}
          </p>
        ) : null}
        {state.error ? (
          <p role="alert" className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{messages.common.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{messages.common.password}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              dir="ltr"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {isPending
              ? messages.common.pleaseWait
              : isLogin
                ? messages.auth.loginSubmit
                : messages.auth.signupSubmit}
            {!isPending ? <ArrowRight className="h-4 w-4 rtl:rotate-180" /> : null}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isLogin ? messages.auth.noAccount : messages.auth.hasAccount}{" "}
          <Link
            className="font-semibold text-primary"
            href={isLogin ? "/signup" : "/login"}
          >
            {isLogin ? messages.auth.signupSubmit : messages.auth.loginSubmit}
          </Link>
        </p>
      </Card>
    </div>
  );
}
