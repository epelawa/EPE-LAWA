"use client";

import { useEffect, useState } from "react";
import { applyTheme, cycleTheme, readStoredTheme, ThemeChoice } from "../lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeChoice>(() => readStoredTheme());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      applyTheme(theme);
    }
  }, [theme, mounted]);

  const handleClick = () => {
    const nextTheme = cycleTheme();
    setTheme(nextTheme);
  };

  if (!mounted) {
    return null;
  }

  const isDark = theme === "dark" || (theme === "system" && 
    (typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false));

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`ui-theme-toggle ${className}`}
      aria-label="Toggle theme"
      aria-live="polite"
    >
      {isDark ? (
        <svg aria-hidden="true" focusable="false" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg aria-hidden="true" focusable="false" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}

export function ThemeToggleWithLabel({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeChoice>(() => readStoredTheme());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      applyTheme(theme);
    }
  }, [theme, mounted]);

  const handleClick = () => {
    const nextTheme = cycleTheme();
    setTheme(nextTheme);
  };

  if (!mounted) {
    return null;
  }

  const isDark = theme === "dark" || (theme === "system" && 
    (typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false));

  const label = theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`ui-theme-toggle ui-theme-toggle--with-label ${className}`}
      aria-label={`Current theme: ${label}. Click to change.`}
      aria-live="polite"
    >
      {isDark ? (
        <svg aria-hidden="true" focusable="false" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg aria-hidden="true" focusable="false" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
      <span className="ui-theme-toggle__label">{label}</span>
    </button>
  );
}
