import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await createClient();
    const [business, corrections, enquiries, events, songRequests, appeals, forumReports] = await Promise.all([
      db.from("businesses").select("id", { count: "exact", head: true }).in("status", ["submitted", "reviewing"]).is("deleted_at", null),
      db.from("people_corrections").select("id", { count: "exact", head: true }).eq("state", "open"),
      db.rpc("staff_enquiry_list"),
      db.from("events").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      db.from("radio_song_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
      db.from("moderation_appeals").select("id", { count: "exact", head: true }).eq("status", "open"),
      db.from("forum_reports").select("id", { count: "exact", head: true }).eq("state", "open"),
    ]);
    const openEnquiries = Array.isArray(enquiries.data)
      ? (enquiries.data as { status?: string }[]).filter((row) => row?.status === "open").length
      : 0;
    return NextResponse.json(
      {
        state: "ok",
        queues: {
          submissions: business.error ? null : business.count ?? 0,
          corrections: corrections.error ? null : corrections.count ?? 0,
          enquiries: enquiries.error ? null : openEnquiries,
          events: events.error ? null : events.count ?? 0,
          songRequests: songRequests.error ? null : songRequests.count ?? 0,
          appeals: appeals.error ? null : appeals.count ?? 0,
          forumReports: forumReports.error ? null : forumReports.count ?? 0,
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { state: "unavailable", queues: { submissions: null, corrections: null, enquiries: null, events: null, songRequests: null, appeals: null, forumReports: null } },
      { headers: { "cache-control": "no-store" } },
    );
  }
}
