import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formAdminClient } from "../../main/lib/form-server";

/**
 * Live counts behind the admin notification dots (turn 24). Every count runs
 * with the signed-in staff member's own session, so row-level security decides
 * what each person can see: a queue they cannot read counts as null (no dot),
 * never as someone else's work. Storage jobs are service-role only, so that one
 * count is read with the service key after the same primary-admin check the
 * Storage desk uses.
 */

export type LiveQueues = {
  submissions: number | null;
  corrections: number | null;
  articleCorrections: number | null;
  enquiries: number | null;
  supportTickets: number | null;
  events: number | null;
  appeals: number | null;
  forumReports: number | null;
  commentReports: number | null;
  aiEscalations: number | null;
  aiRunning: number | null;
  storageRunning: number | null;
};

export const EMPTY_QUEUES: LiveQueues = {
  submissions: null, corrections: null, articleCorrections: null, enquiries: null, supportTickets: null, events: null, appeals: null,
  forumReports: null, commentReports: null, aiEscalations: null, aiRunning: null, storageRunning: null,
};

type CountResult = { count: number | null; error: unknown };
const counted = (result: CountResult) => (result.error ? null : result.count ?? 0);

/** A run that has not finished within 15 minutes is stale (the server limit is 5), not running. */
const RUNNING_WINDOW_MS = 15 * 60 * 1000;

export async function readLiveQueues(db: SupabaseClient, now = Date.now()): Promise<LiveQueues> {
  const since = new Date(now - RUNNING_WINDOW_MS).toISOString();
  const head = { count: "exact" as const, head: true };
  const [business, corrections, articleCorrections, enquiries, support, events, appeals, forumReports, commentReports, escalations, running, primary] = await Promise.all([
    db.from("businesses").select("id", head).in("status", ["submitted", "reviewing"]).is("deleted_at", null),
    db.from("people_corrections").select("id", head).eq("state", "open"),
    db.from("article_correction_reports").select("id", head).eq("status", "open"),
    db.rpc("staff_enquiry_list"),
    db.rpc("staff_support_list", { p_status: "attention" }),
    db.from("events").select("id", head).eq("status", "submitted"),
    db.from("moderation_appeals").select("id", head).eq("status", "open"),
    db.from("forum_reports").select("id", head).eq("state", "open"),
    db.from("comment_reports").select("id", head).eq("state", "open"),
    db.from("ai_activity").select("id", head).eq("outcome", "escalated").is("resolved_at", null),
    db.from("ai_runs").select("id", head).eq("status", "running").neq("job", "tick").gte("started_at", since),
    db.rpc("staff_roles_authorized"),
  ]);
  const openEnquiries = Array.isArray(enquiries.data)
    ? (enquiries.data as { status?: string }[]).filter((row) => row?.status === "open").length
    : 0;
  const isPrimary = !primary.error && primary.data === true;
  let storageRunning: number | null = null;
  if (isPrimary) {
    try {
      const jobs = await formAdminClient().from("storage_jobs").select("id", head).eq("status", "running").gte("updated_at", since);
      storageRunning = counted(jobs);
    } catch { storageRunning = null; }
  }
  return {
    submissions: counted(business),
    corrections: counted(corrections),
    articleCorrections: counted(articleCorrections),
    enquiries: enquiries.error ? null : openEnquiries,
    supportTickets: support.error ? null : Array.isArray(support.data) ? support.data.length : 0,
    events: counted(events),
    appeals: counted(appeals),
    forumReports: counted(forumReports),
    commentReports: counted(commentReports),
    // The AI desks are primary-admin only; nobody else gets those dots.
    aiEscalations: isPrimary ? counted(escalations) : null,
    aiRunning: isPrimary ? counted(running) : null,
    storageRunning,
  };
}
