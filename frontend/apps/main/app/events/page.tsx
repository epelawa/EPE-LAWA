import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { EmptyPanel, PageFrame } from "../../components/design-system";
import SubmitEventModal from "./submit-modal";
import styles from "./events.module.css";

export const metadata: Metadata = {
  title: "Events",
  description: "Festivals, meetings, markets and gatherings across Epe Division — reviewed by the EPE LAWA desk.",
  alternates: { canonical: "/events" },
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  venue: string | null;
  category: string | null;
  starts_at: string;
  ends_at: string | null;
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function eventDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date to be confirmed" : date.toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short" });
}

function icsForEvent(event: EventRow): string {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EPE LAWA//Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@epelawa`,
    `SUMMARY:${event.title.replace(/\r?\n/g, " ")}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\r?\n/g, " ").slice(0, 300)}` : "",
    event.venue ? `LOCATION:${event.venue.replace(/\r?\n/g, " ")}` : "",
    `DTSTART:${stamp(event.starts_at)}`,
    event.ends_at ? `DTEND:${stamp(event.ends_at)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}

export default async function EventsPage() {
  const db = await createClient();
  const [{ data: { user } }, eventsResult] = await Promise.all([
    db.auth.getUser(),
    db.from("events").select("id,slug,title,description,venue,category,starts_at,ends_at")
      .eq("status", "published")
      .gte("starts_at", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(PAGE_SIZE),
  ]);
  if (eventsResult.error) console.error("events list read failed", { code: eventsResult.error.code });
  const events = (eventsResult.data ?? []) as EventRow[];
  const byCategory = new Map<string, EventRow[]>();
  for (const event of events) {
    const key = event.category && event.category.length > 0 ? event.category : "community";
    byCategory.set(key, [...(byCategory.get(key) ?? []), event]);
  }

  return <PageFrame className="ui-stack">
    <header className={styles.header}>
      <div>
        <p className="ui-eyebrow">Community calendar</p>
        <h1>What is happening in Epe.</h1>
        <p className={styles.lede}>Festivals, meetings, markets and gatherings — every entry is reviewed before it is listed. Times are local (WAT).</p>
      </div>
      <div className="ui-actions">
        <a className="btn-secondary" href="/api/events/calendar.ics">Subscribe to the calendar</a>
        <SubmitEventModal signedIn={Boolean(user)} />
      </div>
    </header>

    {eventsResult.error ? <EmptyPanel
      title="The calendar could not load"
      description="We could not reach the community calendar, so no events are shown rather than a guess."
      actions={<Link href="/events" className="btn-secondary">Reload the calendar</Link>}
    /> : !events.length ? <EmptyPanel
      title="No events listed yet"
      description="When the desk publishes community events, they appear here by date."
      actions={user ? <SubmitEventModal signedIn /> : <Link href={`/login?next=${encodeURIComponent("/events")}`} className="btn-secondary">Sign in to submit an event</Link>}
    /> : <section className="ui-stack" aria-label="Upcoming events by category">
      {[...byCategory].map(([category, rows]) => <section key={category} className="ui-stack-sm" aria-labelledby={`events-${category}`}>
        <h2 id={`events-${category}`} className="text-lg font-semibold capitalize">{category}</h2>
        <ul className={styles.eventList}>{rows.map(event => <li key={event.id} className={styles.eventCard}>
          <div className={styles.eventWhen}>
            <time dateTime={event.starts_at}>{eventDate(event.starts_at)}</time>
            {event.ends_at ? <span className="ui-meta">until {new Date(event.ends_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span> : null}
          </div>
          <div className="ui-stack-sm">
            <h3 className="text-base font-semibold">{event.title}</h3>
            {event.venue ? <p className="ui-meta">{event.venue}</p> : null}
            <p className={"ui-prose " + styles.eventDescription}>{event.description}</p>
            <a className="ui-text-link" download={`${event.slug || "event"}.ics`} href={icsForEvent(event)}>Add to calendar</a>
          </div>
        </li>)}</ul>
      </section>)}
    </section>}
  </PageFrame>;
}
