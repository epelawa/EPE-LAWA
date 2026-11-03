export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F9F8F6", color: "#1C1E21", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
        <main style={{ maxWidth: "34rem", margin: "0 auto", padding: "4rem 1rem" }}>
          <p style={{ margin: 0, color: "#0B5A60", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "0.8125rem" }}>EPE LAWA</p>
          <h1 style={{ margin: "0.75rem 0 0", lineHeight: 1.15, fontSize: "2rem" }}>The site did not load</h1>
          <p style={{ margin: "1rem 0 0", color: "#4a4f57" }}>A page-level failure stopped the whole site from rendering. Reload, or try again below.</p>
          <p style={{ margin: "1.5rem 0 0", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <a href="/" style={{ minHeight: "2.75rem", padding: "0.75rem 1.5rem", border: "1px solid transparent", borderRadius: "4px", background: "#0B5A60", color: "#FFFFFF", font: "inherit", fontWeight: 600, textDecoration: "none" }}>Try again</a>
            <a href="/" style={{ color: "#0B5A60", marginLeft: "0.75rem" }}>Return to the homepage</a>
          </p>
        </main>
      </body>
    </html>
  );
}
