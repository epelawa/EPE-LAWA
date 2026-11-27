import { after, NextResponse } from "next/server";
import { formAdminClient } from "../../../../lib/form-server";
import { cronRequestAuthorized } from "../../../../lib/cron-token";
import { runAutopilotPass } from "../../../../lib/ai/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Autopilot heartbeat. The database's pg_cron job posts a single-use nonce here
 * every five minutes while autopilot is on (no shared secret needed); an
 * external cron service may instead send the Cron page token. The pass runs
 * after the response so the caller never waits.
 */
export async function POST(request: Request) {
  let authorized = cronRequestAuthorized(request.headers);
  if (!authorized) {
    const body = (await request.json().catch(() => null)) as { nonce?: unknown } | null;
    const nonce = typeof body?.nonce === "string" ? body.nonce : "";
    if (/^[a-f0-9]{64}$/.test(nonce)) {
      try {
        const { data } = await formAdminClient().rpc("ai_tick_consume", { p_nonce: nonce });
        authorized = data === true;
      } catch {
        authorized = false;
      }
    }
  }
  if (!authorized) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  after(async () => {
    try {
      await runAutopilotPass({ trigger: "schedule" });
    } catch (error) {
      console.error("ai autopilot pass failed", { message: error instanceof Error ? error.message : "unknown" });
    }
  });
  return NextResponse.json({ accepted: true }, { status: 202, headers: { "cache-control": "no-store" } });
}
