/**
 * Public liveness probe.
 *
 * The response fields are fixed on purpose: no environment values, dependency
 * URLs, framework/runtime versions, git internals or error text can reach a
 * caller through this endpoint. A dependency check is deliberately omitted —
 * a real readiness probe needs its own contract and a bounded timeout.
 */
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

export async function GET(): Promise<Response> {
  try {
    return Response.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptimeSeconds: process.uptime(),
      },
      { status: 200, headers: NO_STORE },
    );
  } catch {
    // Fixed status only — never leak error text, env or dependency details.
    return Response.json({ status: "error" }, { status: 500, headers: NO_STORE });
  }
}
