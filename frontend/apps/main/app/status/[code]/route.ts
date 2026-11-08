// Status reference endpoints return the specified status; they are not live health checks.
// 1xx, redirects and no-content statuses cannot be represented as ordinary HTML pages.
const labels: Record<number, string> = {
  200: "Request successful", 400: "Bad request", 401: "Unauthorised", 403: "Access denied", 404: "Page not found",
  405: "Method not allowed", 408: "Request timed out", 410: "Page no longer available", 413: "Request too large", 415: "Unsupported format", 422: "Unable to process request", 429: "Too many requests",
  500: "Server error", 501: "Not implemented", 502: "Bad gateway", 503: "Service unavailable", 504: "Gateway timeout",
};

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const valid = /^\d{3}$/.test(code) && (code === "200" || (Number(code) >= 400 && Number(code) <= 599));
  const status = valid ? Number(code) : 404;
  const label = valid ? (labels[status] ?? (status < 500 ? "Request error" : "Server error")) : "Page not found";
  const headers: Record<string, string> = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (status === 401) headers["WWW-Authenticate"] = 'Bearer realm="EPE LAWA"';
  if (status === 405) headers.Allow = "GET, HEAD";

  const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>${status} ${label} | EPE LAWA</title>
  <link rel="icon" href="/favicon.ico">
  <style>
    :root {
      color-scheme: light;
      --page: #F1F4FA; --ink: #0A1023; --surface: #FFFFFF; --line: #D8E0EC;
      --primary: #477FE0; --primary-ink: #0A1023; --link: #294B91; --muted: #40516F; --soft: #E7EDF8;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; padding: 40px 20px; display: grid; place-items: center; background: var(--page); color: var(--ink); font-family: ui-sans-serif,system-ui,sans-serif; font-size: 16px; line-height: 1.7; }
    main { width: 100%; max-width: 680px; padding: clamp(24px,6vw,56px); border: 1px solid var(--line); border-radius: 28px; background: var(--surface); }
    .eyebrow { color: var(--link); font-size: 12px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; }
    .code { display: inline-block; margin-top: 20px; padding: 5px 12px; border-radius: 999px; background: var(--soft); color: var(--link); font-size: 14px; }
    h1 { margin: 20px 0; font-size: clamp(28px,5vw,36px); line-height: 1.15; letter-spacing: -.04em; font-weight: 550; }
    p { margin: 0 0 24px; color: var(--muted); }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    form { margin: 0; }
    button,a.action { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 11px 22px; border-radius: 999px; font-family: inherit; font-size: 14px; font-weight: 600; line-height: 1.5; text-decoration: none; border: 1px solid var(--link); cursor: pointer; }
    button { background: var(--primary); color: var(--primary-ink); border-color: var(--primary); }
    a { color: var(--link); }
    :focus-visible { outline: 2px solid var(--primary); outline-offset: 4px; }
    .skip-link { position: fixed; top: 10px; left: 20px; transform: translateY(-160%); background: var(--primary); color: var(--primary-ink); padding: 12px 20px; border-radius: 12px; }
    .skip-link:focus { transform: none; }
    @media (prefers-color-scheme: dark) {
      :root { color-scheme: dark; --page: #0A1023; --ink: #F1F4FA; --surface: #17264A; --line: #293650; --link: #A7C5F5; --muted: #A6B2C5; --soft: #223253; }
    }
    @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <main id="main" tabindex="-1">
    <p class="eyebrow">EPE LAWA · Request reference</p>
    <span class="code">HTTP ${status}</span>
    <h1>${label}</h1>
    <p>This is a status reference page, not a live service or incident report.</p>
    <div class="actions"><form method="get"><button type="submit">Try again</button></form><a class="action" href="/">Return to the homepage</a></div>
  </main>
</body>
</html>`;
  return new Response(page, { status, headers });
}
