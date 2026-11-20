/**
 * Public liveness probe.
 *
 * The response fields are fixed on purpose: no environment values, dependency
 * URLs, framework/runtime versions, git internals or error text can reach a
 * caller through this endpoint. A dependency check is deliberately omitted —
 * a real readiness probe needs its own contract and a bounded timeout.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
