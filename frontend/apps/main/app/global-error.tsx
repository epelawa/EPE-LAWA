"use client";

/**
 * The last resort boundary: it replaces the root layout, so the design tokens and the shared
 * stylesheet are not guaranteed to be loaded. The few values below are the approved palette
 * transcribed inline, which is the one place that is correct — there is no stylesheet to
 * reference. Keep them in step with packages/ui/tokens.css.
 */
const colours = {
  bg: "#F9F8F6",
  text: "#1C1E21",
  muted: "#4a4f57",
  primary: "#0B5A60",
  onPrimary: "#FFFFFF",
};

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  void error;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: colours.bg,
          color: colours.text,
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          lineHeight: 1.6,
        }}
      >
        <main style={{ maxWidth: "34rem", margin: "0 auto", padding: "4rem 1rem" }}>
          <p style={{ margin: 0, color: colours.primary, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "0.8125rem" }}>
            EPE LAWA
          </p>
          <h1 style={{ margin: "0.75rem 0 0", lineHeight: 1.15, fontSize: "2rem" }}>The site did not load</h1>
          <p style={{ margin: "1rem 0 0", color: colours.muted }}>
            A page-level failure stopped the whole site from rendering. Reload, or try again below.
          </p>
          <p style={{ margin: "1.5rem 0 0", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: "2.75rem",
                padding: "0.75rem 1.5rem",
                border: "1px solid transparent",
                borderRadius: "4px",
                background: colours.primary,
                color: colours.onPrimary,
                font: "inherit",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a href="/" style={{ color: colours.primary }}>Return to the homepage</a>
          </p>
        </main>
      </body>
    </html>
  );
}
