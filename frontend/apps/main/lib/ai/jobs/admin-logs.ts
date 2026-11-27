import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chatJson, type Budget } from "../openrouter";
import type { RunLog } from "../activity";

type Summary = { actor_id: string; summary: string };

const SYSTEM = `You write the activity explanations in the EPE LAWA admin audit log. For each administrator you get their raw events for one period (sign-ins with device and location, pages opened, form submissions, and database audit actions with their notes).
Explain in detail, in plain English, what the person did and in what order, with exact Lagos times (WAT) taken from the events, which device and location they used, and the stated reasons or notes. Mention anything unusual (new device or location, failed sign-ins, deletions, permission changes, actions at odd hours) as a factual observation, not an accusation.
Use only the events given; never guess intent beyond the stated reasons.
Return ONLY JSON: {"summaries":[{"actor_id":"<id>","summary":"80-400 words"}]}`;

function lagos(value: string): string {
  return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}

export async function runAdminLogJob(db: SupabaseClient, ctx: { log: RunLog; budget: Budget; deadline: number; periodStart: Date; periodEnd: Date }): Promise<string> {
  const since = ctx.periodStart.toISOString();
  const until = ctx.periodEnd.toISOString();
  const [activity, audit] = await Promise.all([
    db.from("admin_activity_log").select("created_at,actor_id,actor_email,event,method,path,section,action_id,reason,ip,device,browser,os,city,region,country,metadata").gte("created_at", since).lt("created_at", until).not("actor_id", "is", null).order("created_at").limit(600),
    db.rpc("admin_audit_feed", { p_since: since, p_until: until, p_actor: null }),
  ]);
  type Row = { at: string; what: string };
  const byActor = new Map<string, { email: string | null; rows: Row[] }>();
  const push = (id: string, email: string | null, row: Row) => {
    const entry = byActor.get(id) ?? { email, rows: [] };
    entry.email ??= email;
    entry.rows.push(row);
    byActor.set(id, entry);
  };
  for (const row of activity.data ?? []) {
    const where = [row.city, row.region, row.country].filter(Boolean).join(", ");
    const device = [row.device, row.browser, row.os].filter(Boolean).join(" / ");
    push(String(row.actor_id), row.actor_email, { at: lagos(String(row.created_at)), what: `${row.event}${row.section ? ` · ${row.section}` : ""}${row.path ? ` (${row.method ?? "GET"} ${row.path})` : ""}${row.reason ? ` · reason: ${row.reason}` : ""}${device ? ` · ${device}` : ""}${where ? ` · ${where}` : ""}${row.ip ? ` · IP ${row.ip}` : ""}` });
  }
  for (const row of (audit.data ?? []) as { created_at: string; actor_id: string | null; actor_email: string | null; actor_kind: string; action: string; resource_type: string; outcome: string; metadata: Record<string, unknown> }[]) {
    if (!row.actor_id || row.actor_kind !== "staff") continue;
    push(row.actor_id, row.actor_email, { at: lagos(row.created_at), what: `audit ${row.action} on ${row.resource_type} → ${row.outcome} ${JSON.stringify(row.metadata ?? {}).slice(0, 300)}` });
  }
  // The AI's own identity is audited in AI processes, not here (logs cover admins only).
  const { data: settings } = await db.from("ai_settings").select("actor_user_id").eq("id", 1).maybeSingle();
  if (settings?.actor_user_id) byActor.delete(String(settings.actor_user_id));
  if (!byActor.size) return "No admin activity in the period.";

  const actors = [...byActor.entries()].slice(0, 6);
  const result = await chatJson(db, {
    job: "admin_logs",
    runId: ctx.log.runId,
    budget: ctx.budget,
    deadline: ctx.deadline,
    maxTokens: 3000,
    validate: (value) => {
      const list = (value as { summaries?: unknown })?.summaries;
      if (!Array.isArray(list)) return null;
      const ids = new Set(actors.map(([id]) => id));
      const rows = list.map((entry) => entry as Record<string, unknown>).filter((entry) => typeof entry.actor_id === "string" && ids.has(entry.actor_id) && typeof entry.summary === "string" && entry.summary.trim().length > 20)
        .map((entry) => ({ actor_id: String(entry.actor_id), summary: String(entry.summary).trim().slice(0, 6000) }));
      return rows.length ? (rows as Summary[]) : null;
    },
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify({ period: `${lagos(since)} to ${lagos(until)} WAT`, admins: actors.map(([id, entry]) => ({ actor_id: id, email: entry.email, events: entry.rows.slice(0, 120) })) }) }],
  });
  if (!result.ok) {
    await ctx.log.record({ job: "admin_logs", action: "logs.explain", outcome: "failed", title: "Admin activity not explained", reason: result.error });
    return "Model unavailable.";
  }
  for (const summary of result.data) {
    const entry = byActor.get(summary.actor_id);
    await db.from("admin_activity_summaries").upsert({ actor_id: summary.actor_id, actor_email: entry?.email ?? null, period_start: since, period_end: until, summary: summary.summary, model: result.model, events: entry?.rows.length ?? 0 }, { onConflict: "actor_id,period_start" });
  }
  await ctx.log.record({ job: "admin_logs", action: "logs.explain", outcome: "done", title: `Explained activity for ${result.data.length} admin${result.data.length === 1 ? "" : "s"}`, reason: `Period ${lagos(since)} – ${lagos(until)} WAT.`, model: result.model });
  return `Explained ${result.data.length} admins.`;
}
