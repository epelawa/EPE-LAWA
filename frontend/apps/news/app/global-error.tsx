"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body style={{ margin: 0, padding: "4rem 1.5rem", background: "#F9F8F6", color: "#1C1E21", fontFamily: "system-ui, sans-serif" }}><main style={{ maxWidth: "44rem", margin: "auto" }}><p>EPE LAWA News</p><h1>Something went wrong</h1><p>We couldn’t load this page. Please try again.</p><button type="button" onClick={() => reset()}>Try again</button> <a href="/">Return to the news homepage</a></main></body></html>;
}
