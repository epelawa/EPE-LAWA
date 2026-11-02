"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@epelawa/ui";
import { applyTheme, readStoredTheme, resolveTheme, type ThemeChoice } from "../lib/theme";

/**
 * Light/dark switch.
 *
 * The button is rendered on the server with a neutral label and no icon-specific state, then
 * updates after mount. That avoids a hydration mismatch, and it means a reader whose browser
 * never runs JavaScript still gets the theme their device asked for — the inline script in
 * <head> already applied it.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(resolveTheme(readStoredTheme()));
    setReady(true);

    // Follow the device if the reader has not made an explicit choice.
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
      className="ep-icon-btn theme-toggle"
      aria-label={ready ? `Switch to ${next} theme` : "Switch theme"}
      title={ready ? `Switch to ${next} theme` : undefined}
      data-ready={ready ? "true" : "false"}
      onClick={() => setTheme(applyTheme(next))}
    >
      {/* Both icons exist in the DOM so the button never changes width and never jumps. */}
      <span className="theme-toggle__icon" data-active={theme === "light" ? "true" : "false"}>
        <SunIcon size={20} />
      </span>
      <span className="theme-toggle__icon" data-active={theme === "dark" ? "true" : "false"}>
        <MoonIcon size={20} />
      </span>
    </button>
  );
}
