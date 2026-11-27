import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AiJob = "news" | "enquiries" | "businesses" | "ads" | "moderation" | "admin_logs";
export type Outcome = "done" | "skipped" | "escalated" | "failed";

export type ActivityEntry = {
  job: string;
  action: string;
  outcome: Outcome;
  title?: string | null;
  reason?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  model?: string | null;
  details?: Record<string, unknown>;
};

export class RunLog {
  readonly counts: Record<Outcome, number> = { done: 0, skipped: 0, escalated: 0, failed: 0 };
  constructor(private readonly db: SupabaseClient, readonly runId: string | null, readonly actorId: string | null) {}

  async record(entry: ActivityEntry) {
    this.counts[entry.outcome] += 1;
    const { error } = await this.db.from("ai_activity").insert({
      run_id: this.runId,
      job: entry.job,
      action: entry.action.slice(0, 80),
      outcome: entry.outcome,
      title: entry.title?.slice(0, 300) ?? null,
      reason: entry.reason?.slice(0, 4000) ?? null,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      model: entry.model?.slice(0, 120) ?? null,
      details: entry.details ?? {},
      actor_id: this.actorId,
    });
    if (error) console.error("ai activity write failed", { code: error.code });
  }
}

export async function startRun(db: SupabaseClient, job: AiJob, trigger: "schedule" | "manual", triggeredBy: string | null): Promise<string | null> {
  const { data, error } = await db.from("ai_runs").insert({ job, trigger, triggered_by: triggeredBy }).select("id").single();
  if (error) {
    console.error("ai run start failed", { code: error.code });
    return null;
  }
  return String(data.id);
}

export async function finishRun(db: SupabaseClient, runId: string | null, log: RunLog, summary: string, extra: Record<string, unknown> = {}) {
  if (!runId) return;
  const { done, skipped, escalated, failed } = log.counts;
  const status = failed && !done ? "failed" : failed || escalated ? "partial" : done ? "success" : "skipped";
  await db.from("ai_runs").update({
    finished_at: new Date().toISOString(),
    status,
    summary: summary.slice(0, 2000),
    stats: { done, skipped, escalated, failed, ...extra },
  }).eq("id", runId);
}

/** An escalation is raised once per item; the next run skips items a human has not answered yet. */
export async function openEscalation(db: SupabaseClient, resourceId: string, action: string): Promise<boolean> {
  const { count } = await db.from("ai_activity").select("id", { count: "exact", head: true })
    .eq("resource_id", resourceId).eq("action", action).eq("outcome", "escalated").is("resolved_at", null);
  return (count ?? 0) > 0;
}

/** Human-readable database error, never the raw message (which may include SQL detail). */
export function rpcProblem(error: { code?: string; message?: string } | null): string {
  if (!error) return "unknown error";
  const known = /^[a-z_]{3,60}$/.test(error.message ?? "") ? error.message : null;
  return `${known ?? "database error"}${error.code ? ` (${error.code})` : ""}`;
}
