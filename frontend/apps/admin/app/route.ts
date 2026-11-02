export function GET() {
  return new Response("Administration is not available yet.", {
    status: 503,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
