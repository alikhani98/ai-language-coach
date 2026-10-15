import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getProfile } from "@/lib/actions/profile";
import { logout } from "@/lib/actions/auth";
import { accountDestination, type AccountStatus } from "@/lib/admin/model";
import { getMessages } from "@/lib/i18n/config";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";
import { ThemeSelector } from "@/components/theme-selector";
export async function AccountStatusPage({
  status,
}: {
  status: Exclude<AccountStatus, "active">;
}) {
  const profile = await getProfile();
  const destination = accountDestination(profile?.status);
  if (!destination) redirect("/dashboard");
  if (destination !== accountDestination(status)) redirect(destination);
  const language = profile?.interface_language ?? "en";
  const messages = getMessages(language);
  const m = messages.admin;
  return (
    <Card className="mx-auto max-w-xl space-y-6 p-6 sm:p-10">
      <ShieldCheck className="h-10 w-10 text-primary" aria-hidden="true" />
      <p className="text-sm font-medium text-muted-foreground">
        {messages.common.appName}
      </p>
      <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-sm font-medium">
        {m[status]}
      </span>
      <h1 className="type-title">{m[`${status}Title`]}</h1>
      <p className="type-copy text-muted-foreground">{m[`${status}Body`]}</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard">{m.refresh}</Link>
        </Button>
        <form action={logout}>
          <Button>{messages.nav.logout}</Button>
        </form>
      </div>
      <div className="grid gap-4 border-t pt-6 sm:grid-cols-2">
        <LanguageSelector currentLanguage={language} messages={messages} />
        <ThemeSelector messages={messages} persistToProfile />
      </div>
    </Card>
  );
}
