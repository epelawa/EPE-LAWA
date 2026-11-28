import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { EmptyPanel, PageFrame } from "../../components/design-system";
import SubmitEventModal from "./submit-modal";
import AddToCalendar from "./add-to-calendar";
import { eventCategoryLabel } from "./event-categories";
import { googleCalendarUrl } from "../../lib/event-calendar";
import { publicMediaUrl } from "../../lib/media";
import { siteUrl } from "../../lib/site";
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
  image_key: string | null;
  image_alt: string | null;
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function eventDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date to be confirmed" : date.toLocaleString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" });
}

export default async function EventsPage() {
  const db = await createClient();
  const [{ data: { user } }, eventsResult] = await Promise.all([
    db.auth.getUser(),
    db.from("events").select("id,slug,title,description,venue,category,starts_at,ends_at,image_key,image_alt")
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
        <h1>What is happening in Epe.</h1>
        <p className={styles.lede}>Festivals, meetings, markets and gatherings — every entry is reviewed before it is listed. Times are local (WAT).</p>
      </div>
      <div className="ui-actions">
        <a className="btn-secondary" href="/api/events/calendar.ics" download="epe-lawa-community-events.ics">Download the calendar (.ics)</a>
        <SubmitEventModal signedIn={Boolean(user)} accountEmail={user?.email ?? null} />
      </div>
    </header>

    {eventsResult.error ? <EmptyPanel
      title="The calendar could not load"
      description="We could not reach the community calendar, so no events are shown rather than a guess."
      actions={<Link href="/events" className="btn-secondary">Reload the calendar</Link>}
    /> : !events.length ? <EmptyPanel
      title="No events listed yet"
      description="When the desk publishes community events, they appear here by date. Know of one? Send it in — signing in is optional."
      actions={<SubmitEventModal signedIn={Boolean(user)} accountEmail={user?.email ?? null} variant="secondary" />}
    /> : <section className="ui-stack" aria-label="Upcoming events by category">
      {[...byCategory].map(([category, rows]) => <section key={category} className="ui-stack-sm" aria-labelledby={`events-${category}`}>
        <h2 id={`events-${category}`} className={styles.categoryHeading}>{eventCategoryLabel(category)}</h2>
        <ul className={styles.eventList}>{rows.map(event => { const image = publicMediaUrl(event.image_key); return <li key={event.id} id={`event-${event.slug}`} className={styles.eventCard}>
          {image ? <div className={styles.eventImage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={event.image_alt ?? ""} loading="lazy" decoding="async" width={640} height={360} />
          </div> : null}
          <div className={styles.eventWhen}>
            <time dateTime={event.starts_at}>{eventDate(event.starts_at)}</time>
            {event.ends_at ? <span className="ui-meta">until {new Date(event.ends_at).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" })}</span> : null}
          </div>
          <div className="ui-stack-sm">
            <h3 className={styles.eventTitle}>{event.title}</h3>
            {event.venue ? <p className="ui-meta">{event.venue}</p> : null}
            <p className={"ui-prose " + styles.eventDescription}>{event.description}</p>
            <AddToCalendar title={event.title} googleUrl={googleCalendarUrl(event, siteUrl)} icsUrl={`/api/events/${event.slug}/ics`} />
          </div>
        </li>; })}</ul>
      </section>)}
    </section>}
  </PageFrame>;
}
