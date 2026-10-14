import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppNav } from "@/components/app-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { getCurrentUser } from "@/lib/auth/user";
import { getProfile } from "@/lib/actions/profile";
import { getTextDirection, resolveInterfaceLanguage } from "@/lib/i18n/config";
import { resolveThemePreference } from "@/lib/theme/config";

const persian = localFont({
  src: "./fonts/vazirmatn-variable.woff2",
  variable: "--font-persian",
  weight: "100 900",
  display: "swap",
  fallback: ["Tahoma", "Arial"],
});

const latin = localFont({
  src: "./fonts/inter-variable.woff2",
  variable: "--font-latin",
  weight: "100 900",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "AI Language Coach",
  description: "A focused daily English practice coach.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const profile = user ? await getProfile() : null;
  const language = resolveInterfaceLanguage(profile);
  const themePreference = profile
    ? resolveThemePreference(profile.theme_preference)
    : null;
  const themeScript = `
    (function() {
      try {
        var serverPreference = ${JSON.stringify(themePreference)};
        var preference = serverPreference || localStorage.getItem("zaban-theme") || "system";
        var hour = new Date().getHours();
        var systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        var effective = preference === "dark" || (preference === "system" && systemDark) || (preference === "auto" && (hour < 6 || hour >= 18)) ? "dark" : "light";
        document.documentElement.classList.toggle("dark", effective === "dark");
        document.documentElement.dataset.themePreference = preference;
      } catch (error) {}
    })();
  `;

  return (
    <html
      lang={language}
      dir={getTextDirection(language)}
      className={`${persian.variable} ${latin.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider initialPreference={themePreference}>
          <div className="min-h-screen">
            <AppNav />
            <main id="main-content" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-7 sm:px-6 md:pb-12 md:pt-10 lg:px-8">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
