import Link from "next/link";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { decideEvent } from "./actions";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  venue: string | null;
  category: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  created_at: string;
};

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ decided?: string; error?: string }> }) {
  const query = await searchParams;
  const db = await createStaffClient();
  const { data: allowed } = await db.rpc("has_capability", { p_capability: "article.publish" });
  if (allowed !== true) {
    return <PageFrame className="ui-stack">
      <PageIntro eyebrow="Community · Staff" title="Events queue" description="Review submitted community events before they join the public calendar." />
      <Notice tone="danger" role="alert">Article publish capability is required to review event submissions.</Notice>
    </PageFrame>;
  }

  const { data, error } = await db.from("events")
    .select("id,slug,title,description,venue,category,starts_at,ends_at,status,created_at")
    .in("status", ["submitted", "rejected"])
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as EventRow[];

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Community · Staff" title="Events queue" description="Review submitted community events. Publishing adds the event to the public calendar and its feed." />
    {query.decided ? <Notice tone="success" role="status">Event decision recorded.</Notice> : null}
    {query.error ? <Notice tone="danger" role="alert">The event decision needs publish/reject and a note for rejections.</Notice> : null}

    {error ? <EmptyPanel title="Queue unavailable" description="Event submissions could not be loaded. Try again later." />
      : !rows.length ? <EmptyPanel title="No events awaiting review" description="Member-submitted events appear here for a publish decision." />
      : <section className="ui-stack-sm">
        <SectionHeading eyebrow="Queue" title="Submitted events" description="Publish to place the event on the community calendar; reject with a reason." />
        <ul className="ui-list ui-stack-sm">{rows.map(event => <li key={event.id}><Panel className="ui-stack-sm">
          <div className="ui-row"><StatusBadge tone={event.status === "submitted" ? "warning" : "neutral"}>{event.status}</StatusBadge><span className="ui-meta">Received {new Date(event.created_at).toLocaleString("en-NG")}</span></div>
          <div><h2 className="ui-item-title">{event.title}</h2><p className="ui-meta">{event.venue ?? "Venue to be confirmed"} · {new Date(event.starts_at).toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short" })}{event.ends_at ? ` · until ${new Date(event.ends_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}` : ""}{event.category ? ` · ${event.category}` : ""}</p></div>
          <p className="ui-prose">{event.description}</p>
          <form action={decideEvent} className="ui-stack-sm ui-divider">
            <input type="hidden" name="event_id" value={event.id} />
            <div className="ui-form-grid">
              <label className="ui-field"><span className="label">Decision</span><select name="status" required defaultValue="" className="input"><option value="" disabled>Choose a decision</option><option value="published">Publish to the calendar</option><option value="rejected">Reject — with a reason</option></select></label>
              <label className="ui-field"><span className="label">Decision note (required when rejecting)</span><textarea name="note" maxLength={1000} className="input" /></label>
            </div>
            <div className="ui-actions"><button className="btn-primary" type="submit">Record event decision</button></div>
          </form>
        </Panel></li>)}</ul>
      </section>}
    <p className="ui-meta"><Link className="ui-text-link" href="/events">Open the public calendar</Link></p>
  </PageFrame>;
}
