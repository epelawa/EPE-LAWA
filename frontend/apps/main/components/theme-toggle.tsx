"use client";

import { useEffect, useState } from "react";
import { applyTheme, readStoredTheme, resolveTheme, THEME_PREFERENCE_CHANGED_EVENT, type ThemeChoice } from "../lib/theme";

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20.6 15.1A8.7 8.7 0 0 1 8.9 3.4 8.8 8.8 0 1 0 20.6 15.1Z" />
    <path d="m16.8 4.4.5 1.2 1.3.5-1.3.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2Z" />
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
      className="theme-control"
      aria-label={ready ? `Switch to ${next} theme` : "Switch theme"}
      title={ready ? `Switch to ${next} theme` : undefined}
      aria-pressed={theme === "dark"}
      data-theme={theme}
      data-ready={ready ? "true" : "false"}
      onClick={() => {
        setTheme(applyTheme(next));
        window.dispatchEvent(new Event(THEME_PREFERENCE_CHANGED_EVENT));
      }}
    >
      <span className="theme-control__track" aria-hidden="true">
        <span className="theme-control__symbol theme-control__symbol--sun"><SunIcon /></span>
        <span className="theme-control__symbol theme-control__symbol--moon"><MoonIcon /></span>
        <span className="theme-control__thumb">{theme === "light" ? <SunIcon /> : <MoonIcon />}</span>
      </span>
    </button>
  );
}
