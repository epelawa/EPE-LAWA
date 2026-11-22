"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string | undefined;
    };
  }
}

/**
 * Renders the Turnstile challenge inside a form and mirrors the token into a
 * hidden input named `cf-turnstile-response` for the server action. With no
 * configured site key it renders nothing, so forms keep working unverified.
 */
export default function TurnstileField({ compact }: { compact?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState("");
  const [state, setState] = useState<"pending" | "ready" | "expired" | "error">("pending");

  useEffect(() => {
    const target = container.current;
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
    if (!target || !siteKey) return;
    let dismissed = false;
    let widgetId: string | undefined;
    const started = Date.now();
    const poll = window.setInterval(() => {
      if (dismissed) return;
      if (!window.turnstile) {
        if (Date.now() - started > 20_000) { window.clearInterval(poll); setState("error"); }
        return;
      }
      window.clearInterval(poll);
      widgetId = window.turnstile.render(target, {
        sitekey: siteKey,
        theme: "light",
        size: compact ? "compact" : "normal",
        callback: (value: string) => { setToken(value); setState("ready"); },
        "expired-callback": () => { setToken(""); setState("expired"); },
        "error-callback": () => { setToken(""); setState("error"); },
      }) ?? undefined;
    }, 400);
    return () => {
      dismissed = true;
      window.clearInterval(poll);
    };
  }, [compact]);

  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) return null;
  return (
    <div className="ui-stack-sm">
      <div ref={container} />
      <input type="hidden" name="cf-turnstile-response" value={token} />
      {state === "expired" ? <p role="status">The verification expired — complete it again before sending.</p> : null}
      {state === "error" ? <p role="status">Verification could not load. Refresh the page to try again.</p> : null}
    </div>
  );
}
