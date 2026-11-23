"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./icons";
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
        <SunIcon size={20} className="ui-theme-toggle__icon" />
      ) : (
        <MoonIcon size={20} className="ui-theme-toggle__icon" />
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
        <SunIcon size={20} className="ui-theme-toggle__icon" />
      ) : (
        <MoonIcon size={20} className="ui-theme-toggle__icon" />
      )}
      <span className="ui-theme-toggle__label">{label}</span>
    </button>
  );
}
