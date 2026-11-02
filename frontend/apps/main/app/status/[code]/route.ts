// Status reference endpoints return the specified status; they are not live health checks.
// 1xx, redirects and no-content statuses cannot be represented as ordinary HTML pages.
const labels: Record<number, string> = {
  200: "Request successful",
  400: "Bad request", 401: "Unauthorised", 403: "Access denied", 404: "Page not found",
  405: "Method not allowed", 408: "Request timed out", 410: "Page no longer available",
  413: "Request too large", 415: "Unsupported format", 422: "Unable to process request", 429: "Too many requests",
  500: "Server error", 501: "Not implemented", 502: "Bad gateway", 503: "Service unavailable", 504: "Gateway timeout",
};

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const valid = /^\d{3}$/.test(code) && (code === "200" || (Number(code) >= 400 && Number(code) <= 599));
  const status = valid ? Number(code) : 404;
  const label = valid ? (labels[status] ?? (status < 500 ? "Request error" : "Server error")) : "Page not found";
  const headers: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
  if (status === 401) headers["WWW-Authenticate"] = 'Bearer realm="EPE LAWA"';
  if (status === 405) headers.Allow = "GET, HEAD";
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${status} ${label} | EPE LAWA</title><link rel="icon" href="/favicon.ico"><style>body{margin:0;padding:4rem 1.5rem;background:#f9f8f6;color:#1c1e21;font-family:system-ui,sans-serif}main{max-width:44rem;margin:auto}a{color:#0b5a60}button{font:inherit;cursor:pointer}form{display:inline-block;margin-right:1rem}</style></head><body><main><p>EPE LAWA · ${status}</p><h1>${label}</h1><p>This is a status reference page, not a live service or incident report.</p><form method="get"><button type="submit">Try again</button></form><a href="/">Return to the homepage</a></main></body></html>`, { status, headers });
}
