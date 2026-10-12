import Link from "next/link";
import {
  BarChart3,
  BookOpenText,
  Home,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/user";
import { getProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/ui/mobile-nav";
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
    { href: "/dashboard", label: messages.nav.dashboard, icon: Home },
    { href: "/practice", label: messages.nav.practice, icon: Sparkles },
    {
      href: "/conversation",
      label: messages.nav.conversation,
      icon: MessageCircle,
    },
    { href: "/progress", label: messages.nav.progress, icon: BarChart3 },
  ];
  const desktopNavItems = [
    ...navItems,
    { href: "/mistakes", label: messages.nav.mistakes },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="flex min-w-0 items-center gap-2 font-semibold"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BookOpenText className="h-5 w-5" />
              </span>
              <span className="truncate">{messages.common.appName}</span>
            </Link>

            {user && profile ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
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
              <div className="flex flex-wrap items-center justify-end gap-2">
                <ThemeSelector messages={messages} persistToProfile={false} />
                <form action={logout}>
                  <Button type="submit" variant="outline" size="sm">
                    {messages.nav.logout}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <ThemeSelector messages={messages} persistToProfile={false} />
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">{messages.nav.login}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">{messages.nav.signup}</Link>
                </Button>
              </div>
            )}
          </div>

          {user && isOnboardingComplete ? (
            <div className="hidden flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground md:flex">
              {desktopNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          ) : null}
          {user && !isOnboardingComplete ? (
            <Link href="/onboarding" className="font-medium text-primary">
              {messages.nav.completeOnboarding}
            </Link>
          ) : null}
        </nav>
      </header>
      {user && isOnboardingComplete ? (
        <MobileNav items={navItems} />
      ) : null}
    </>
  );
}
