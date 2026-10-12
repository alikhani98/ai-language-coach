"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getEffectiveTheme,
  resolveThemePreference,
  type ThemePreference,
} from "@/lib/theme/config";

const storageKey = "zaban-theme";

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  initialPreference?: ThemePreference | null;
};

export function ThemeProvider({
  children,
  initialPreference,
}: ThemeProviderProps) {
  const hasServerPreference = Boolean(initialPreference);
  const [preference, setPreferenceState] = useState<ThemePreference>(
    resolveThemePreference(initialPreference),
  );

  useEffect(() => {
    if (hasServerPreference) {
      setPreferenceState(resolveThemePreference(initialPreference));
      return;
    }

    setPreferenceState(resolveThemePreference(localStorage.getItem(storageKey)));
  }, [hasServerPreference, initialPreference]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const effective = getEffectiveTheme({
        preference,
        systemDark: mediaQuery.matches,
      });
      document.documentElement.classList.toggle("dark", effective === "dark");
      document.documentElement.dataset.themePreference = preference;
    }

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);
    const interval = window.setInterval(applyTheme, 60000);

    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
      window.clearInterval(interval);
    };
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      setPreference(nextPreference) {
        setPreferenceState(nextPreference);
        localStorage.setItem(storageKey, nextPreference);
      },
    }),
    [preference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemePreference must be used inside ThemeProvider.");
  }

  return context;
}
