"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored || (prefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2.5 px-3 py-2 w-full rounded text-sm text-muted hover:text-text hover:bg-ink transition-colors"
      aria-label="Toggle dark mode"
    >
      {theme === "light" ? <Moon size={15} strokeWidth={1.5} aria-hidden="true" /> : <Sun size={15} strokeWidth={1.5} aria-hidden="true" />}
      <span className="flex-1 text-left">Mode {theme === "light" ? "sombre" : "clair"}</span>
    </button>
  );
}
