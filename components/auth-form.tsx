"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFormProps = {
  mode: "login" | "signup";
  message?: string;
};

export function AuthForm({ mode, message }: AuthFormProps) {
  const isLogin = mode === "login";
  const [state, formAction, isPending] = useActionState(
    isLogin ? login : signup,
    {},
  );

  return (
    <div className="mx-auto max-w-sm rounded-lg border bg-card p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">
          {isLogin ? "Log in" : "Create account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isLogin
            ? "Continue your daily English practice."
            : "Start a calm daily English habit."}
        </p>
      </div>
      {message ? (
        <p className="mt-4 rounded-md border border-accent bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </p>
      ) : null}
      {state.error ? (
        <p className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
          {isPending ? "Please wait" : isLogin ? "Log in" : "Sign up"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        {isLogin ? "No account yet?" : "Already have an account?"}{" "}
        <Link
          className="font-medium text-primary"
          href={isLogin ? "/signup" : "/login"}
        >
          {isLogin ? "Sign up" : "Log in"}
        </Link>
      </p>
    </div>
  );
}
