import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Light mode palette — S46
        bg:      "#FAFAFA",
        surface: "#FFFFFF",
        ink:     "#F4F4F5",
        border:  "#E5E5E5",
        blue:    "#1A5FD4",
        green:   "#16A34A",
        red:     "#DC2626",
        orange:  "#EA580C",
        text:    "#1A1A1A",
        text2:   "#525252",
        muted:   "#737373",
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
