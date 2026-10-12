"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BookOpenText, CheckCircle2 } from "lucide-react";
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
    <div className="mx-auto grid min-h-[calc(100vh-9rem)] w-full max-w-5xl items-center gap-8 py-4 lg:grid-cols-[1fr_0.86fr]">
      <section className="space-y-7">
        <div className="space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <BookOpenText className="h-7 w-7" />
          </div>
          <div className="max-w-xl space-y-3">
            <p className="text-sm font-semibold text-primary">
              {messages.common.appName}
            </p>
            <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
              Your personal AI English coach.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Practice 10 minutes every day with calm lessons, conversation,
              and mistake tracking.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            "Daily English practice",
            "AI conversation",
            "Mistake tracking",
          ].map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 rounded-xl border bg-card px-3 py-3 text-sm font-medium"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </section>

      <Card className="p-5 shadow-lg shadow-foreground/5 sm:p-6">
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
          <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? messages.common.pleaseWait
              : isLogin
                ? messages.auth.loginSubmit
                : messages.auth.signupSubmit}
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
