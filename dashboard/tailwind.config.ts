import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        term: {
          bg: "oklch(0.145 0.004 90)",
          panel: "oklch(0.19 0.006 90)",
          accent: "oklch(0.82 0.19 150)",
          "on-accent": "oklch(0.14 0.01 150)",
          text: "oklch(0.9 0.01 90)",
          body: "oklch(0.78 0.01 90)",
          muted: "oklch(0.62 0.01 90)",
          dim: "oklch(0.55 0.01 90)",
          faint: "oklch(0.42 0.01 90)",
        },
      },
      borderColor: {
        term: "oklch(0.32 0.01 150 / 0.4)",
        "term-soft": "oklch(0.32 0.01 150 / 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
