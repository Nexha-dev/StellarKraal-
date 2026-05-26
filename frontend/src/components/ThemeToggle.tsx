"use client";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-lg p-2 text-xl transition hover:bg-[var(--color-border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
