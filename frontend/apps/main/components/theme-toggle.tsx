"use client";

import { useEffect, useState } from "react";
import { applyTheme, readStoredTheme, resolveTheme, type ThemeChoice } from "../lib/theme";

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(resolveTheme(readStoredTheme()));
    setReady(true);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStoredTheme() !== "system") return;
      setTheme(applyTheme("system"));
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const next: ThemeChoice = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="p-2 text-slate-600 rounded-xl hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
      aria-label={ready ? `Switch to ${next} theme` : "Switch theme"}
      title={ready ? `Switch to ${next} theme` : undefined}
      data-ready={ready ? "true" : "false"}
      onClick={() => setTheme(applyTheme(next))}
    >
      <span className="flex items-center justify-center w-full h-full">
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
}
