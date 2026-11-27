import { NextResponse } from "next/server";
import { createStaffClient } from "../../../../lib/supabase";
import { EMPTY_QUEUES, readLiveQueues } from "../../../../lib/live-queues";

export const dynamic = "force-dynamic";

/** Live counts behind the admin notification dots; see lib/live-queues.ts. */
export async function GET() {
  try {
    const db = await createStaffClient();
    return NextResponse.json({ state: "ok", queues: await readLiveQueues(db) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ state: "unavailable", queues: EMPTY_QUEUES }, { headers: { "cache-control": "no-store" } });
  }
}
