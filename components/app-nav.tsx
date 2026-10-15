import { isProfileComplete } from "@/lib/daily/lesson";
import Link from "next/link";
import { BookOpenText, LogOut, Settings2 } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/user";
import { getProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { MobileNav, NavigationLinks } from "@/components/ui/mobile-nav";
import { LanguageSelector } from "@/components/language-selector";
import { ThemeSelector } from "@/components/theme-selector";
import { getMessages, resolveInterfaceLanguage } from "@/lib/i18n/config";

export async function AppNav() {
  const user = await getCurrentUser();
  const profile = user ? await getProfile() : null;
  const isOnboardingComplete =
    profile?.status === "active" && isProfileComplete(profile);
  const language = resolveInterfaceLanguage(profile);
  const messages = getMessages(language);
  const navItems = [
    { href: "/dashboard", label: messages.coach.home },
    { href: "/practice", label: messages.nav.practice },
    {
      href: "/conversation",
      label: messages.nav.conversation,
    },
    { href: "/progress", label: messages.nav.progress },
  ];
  const desktopNavItems = [
    ...navItems,
    { href: "/mistakes", label: messages.nav.mistakes },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-lg">
        <nav className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="flex min-h-11 min-w-0 items-center gap-3 font-semibold"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BookOpenText className="h-5 w-5" />
              </span>
              <span className="text-sm sm:text-base">
                {messages.common.appName}
              </span>
            </Link>

            {user?.app_metadata?.role === "admin" &&
            profile?.status === "active" ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
                href="/admin"
              >
                {messages.admin.title}
              </Link>
            ) : null}
            {user && profile ? (
              <details className="group relative shrink-0">
                <summary
                  aria-label={messages.common.preferences}
                  className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-secondary [&::-webkit-details-marker]:hidden"
                  title={messages.common.preferences}
                >
                  <Settings2 className="h-5 w-5" />
                </summary>
                <div className="absolute end-0 top-full z-50 mt-3 grid w-64 gap-4 rounded-xl border bg-card p-5 shadow-xl shadow-black/10">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {messages.common.language}
                    </p>
                    <LanguageSelector
                      currentLanguage={language}
                      messages={messages}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {messages.common.theme}
                    </p>
                    <ThemeSelector messages={messages} persistToProfile />
                  </div>
                  {isOnboardingComplete ? (
                    <Link
                      href="/mistakes"
                      className="flex min-h-11 items-center gap-2 border-t pt-3 text-sm font-medium text-primary md:hidden"
                    >
                      <BookOpenText className="h-4 w-4" />
                      {messages.nav.mistakes}
                    </Link>
                  ) : null}
                  <form action={logout}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <LogOut className="h-4 w-4" />
                      {messages.nav.logout}
                    </Button>
                  </form>
                </div>
              </details>
            ) : user ? (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <ThemeSelector messages={messages} persistToProfile={false} />
                <form action={logout}>
                  <Button type="submit" variant="outline" size="sm">
                    {messages.nav.logout}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
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
            <div className="hidden border-t pt-3 md:block">
              <NavigationLinks items={desktopNavItems} />
            </div>
          ) : null}
          {user && profile?.status === "active" && !isOnboardingComplete ? (
            <Link href="/onboarding" className="font-medium text-primary">
              {messages.nav.completeOnboarding}
            </Link>
          ) : null}
        </nav>
      </header>
      {user && isOnboardingComplete ? <MobileNav items={navItems} /> : null}
    </>
  );
}
