import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /** SamenConnect marketing / product accent */
        brand: {
          DEFAULT: "#40ADA8",
          dark: "#35948f",
          light: "#e8f6f5"
        },
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e"
        },
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted-foreground))"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        "soft": "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        "card": "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "lift":
          "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 12px 40px -12px rgb(15 23 42 / 0.09)",
        "hero-mockup":
          "0 24px 60px -16px rgb(15 23 42 / 0.12), 0 0 0 1px rgb(226 232 240 / 0.8)",
        /** Marketing cards — soft depth, minimal hover target */
        premium:
          "0 2px 6px -1px rgb(15 23 42 / 0.05), 0 10px 28px -8px rgb(15 23 42 / 0.09)",
        "premium-hover":
          "0 6px 14px -4px rgb(15 23 42 / 0.07), 0 18px 40px -14px rgb(15 23 42 / 0.11)"
      }
    }
  },
  plugins: []
};

export default config;
