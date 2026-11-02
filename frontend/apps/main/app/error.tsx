"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main><p className="eyebrow">EPE LAWA</p><h1>Something went wrong</h1><p>We couldn’t load this page. Please try again.</p><button type="button" onClick={() => reset()}>Try again</button> <a href="/">Return to the homepage</a></main>;
}
