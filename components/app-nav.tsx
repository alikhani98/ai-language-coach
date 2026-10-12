import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/user";
import { getProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/conversation", label: "Conversation" },
  { href: "/progress", label: "Progress" },
  { href: "/mistakes", label: "Mistakes" },
];

export async function AppNav() {
  const user = await getCurrentUser();
  const profile = user ? await getProfile() : null;
  const isOnboardingComplete = Boolean(profile);

  return (
    <header className="border-b bg-background/90">
      <nav className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link
          href={user ? "/dashboard" : "/login"}
          className="flex items-center gap-2 font-semibold"
        >
          <BookOpenText className="h-5 w-5 text-primary" />
          AI Language Coach
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
              Complete onboarding
            </Link>
          ) : null}
        </div>
        {user ? (
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Log out
            </Button>
          </form>
        ) : (
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        )}
      </nav>
    </header>
  );
}
