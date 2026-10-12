import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/user";
import { getProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";
import { ThemeSelector } from "@/components/theme-selector";
import { getMessages, resolveInterfaceLanguage } from "@/lib/i18n/config";

export async function AppNav() {
  const user = await getCurrentUser();
  const profile = user ? await getProfile() : null;
  const isOnboardingComplete = Boolean(profile);
  const language = resolveInterfaceLanguage(profile);
  const messages = getMessages(language);
  const navItems = [
    { href: "/dashboard", label: messages.nav.dashboard },
    { href: "/practice", label: messages.nav.practice },
    { href: "/conversation", label: messages.nav.conversation },
    { href: "/progress", label: messages.nav.progress },
    { href: "/mistakes", label: messages.nav.mistakes },
  ];

  return (
    <header className="border-b bg-background/90">
      <nav className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link
          href={user ? "/dashboard" : "/login"}
          className="flex items-center gap-2 font-semibold"
        >
          <BookOpenText className="h-5 w-5 text-primary" />
          {messages.common.appName}
        </Link>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {user && isOnboardingComplete
            ? navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))
            : null}
          {user && !isOnboardingComplete ? (
            <Link href="/onboarding" className="font-medium text-primary">
              {messages.nav.completeOnboarding}
            </Link>
          ) : null}
        </div>
        {user && profile ? (
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSelector
              currentLanguage={language}
              messages={messages}
            />
            <ThemeSelector messages={messages} persistToProfile />
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                {messages.nav.logout}
              </Button>
            </form>
          </div>
        ) : user ? (
          <div className="flex flex-wrap items-center gap-2">
            <ThemeSelector messages={messages} persistToProfile={false} />
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                {messages.nav.logout}
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <ThemeSelector messages={messages} persistToProfile={false} />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">{messages.nav.login}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">{messages.nav.signup}</Link>
            </Button>
          </div>
        )}
      </nav>
    </header>
  );
}
