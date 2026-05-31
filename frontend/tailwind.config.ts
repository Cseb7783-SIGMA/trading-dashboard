import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // CSS variables — auto-switch light/dark via .dark class on <html>
        bg:      "var(--bg)",
        surface: "var(--surface)",
        ink:     "var(--ink)",
        border:  "var(--border)",
        blue:    "var(--blue)",
        green:   "var(--green)",
        red:     "var(--red)",
        orange:  "var(--orange)",
        text:    "var(--text)",
        text2:   "var(--text-2)",
        muted:   "var(--muted)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'SF Mono'", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
