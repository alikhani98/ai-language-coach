"use client";

import { useActionState } from "react";
import { createUser } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InterfaceLanguage } from "@/lib/i18n/config";

export function AdminCreateUser({ language }: { language: InterfaceLanguage }) {
  const [state, action, pending] = useActionState(createUser, {});
  const fa = language === "fa";
  return (
    <details className="rounded-xl border bg-card p-5">
      <summary className="cursor-pointer font-semibold">{fa ? "ایجاد حساب زبان‌آموز" : "Create learner account"}</summary>
      <p className="my-3 text-sm text-muted-foreground">
        {fa ? "حساب بلافاصله فعال می‌شود. گذرواژه را از کانالی امن به کاربر برسانید؛ ایمیلی ارسال نمی‌شود." :
          "The account is activated immediately. Share the initial password privately; no email is sent."}
      </p>
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">{fa ? "نام" : "Name"}
          <Input required name="name" autoComplete="off" minLength={2} maxLength={255} /></label>
        <label className="space-y-1 text-sm">{fa ? "ایمیل" : "Email"}
          <Input required name="email" type="email" dir="ltr" autoComplete="off" maxLength={255} /></label>
        <label className="space-y-1 text-sm">{fa ? "گذرواژه اولیه (حداقل ۱۶ نویسه)" : "Initial password (16+ characters)"}
          <Input required name="password" type="password" dir="ltr" minLength={16} maxLength={128} autoComplete="new-password" /></label>
        <label className="space-y-1 text-sm">{fa ? "زبان رابط" : "Interface language"}
          <select name="language" defaultValue={language} className="mt-1 h-11 w-full rounded-lg border bg-background px-3">
            <option value="fa">فارسی</option><option value="en">English</option>
          </select></label>
        {state.result ? <p role={state.result === "saved" ? "status" : "alert"} className="sm:col-span-2 text-sm">
          {state.result === "saved" ? (fa ? "حساب ساخته شد." : "Account created.") :
            state.result === "conflict" ? (fa ? "ایمیل تکراری است." : "Email already exists.") :
            state.result === "invalid" ? (fa ? "اطلاعات واردشده معتبر نیست." : "Invalid information.") :
            (fa ? "ایجاد حساب ناموفق بود." : "Account creation failed.")}
        </p> : null}
        <div className="sm:col-span-2"><Button disabled={pending} type="submit">{pending ? "…" : (fa ? "ساخت حساب" : "Create account")}</Button></div>
      </form>
    </details>
  );
}
