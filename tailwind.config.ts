import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-ui)", "sans-serif"],
        latin: ["var(--font-latin)", "var(--font-persian)", "sans-serif"],
      },
      fontSize: {
        xs: ["var(--text-caption)", { lineHeight: "var(--leading-label)" }],
        sm: ["var(--text-small)", { lineHeight: "var(--leading-copy)" }],
        base: ["1rem", { lineHeight: "var(--leading-copy)" }],
        lg: ["1.125rem", { lineHeight: "var(--leading-heading)" }],
        xl: ["1.25rem", { lineHeight: "var(--leading-heading)" }],
        "2xl": ["1.5rem", { lineHeight: "var(--leading-heading)" }],
        "3xl": ["1.875rem", { lineHeight: "var(--leading-heading)" }],
        "4xl": ["2.25rem", { lineHeight: "var(--leading-heading)" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
