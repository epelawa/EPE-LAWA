import { SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { decideEvent } from "../../../lib/event-actions";
import { publicMediaUrl } from "../../../../main/lib/media";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, StatusBadge } from "@epelawa/ui";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type QueueRow = {
  id: string; slug: string; title: string; description: string | null; venue: string | null; category: string | null;
  starts_at: string; ends_at: string; status: string; created_at: string;
  image_key: string | null; image_alt: string | null;
  submitter_id: string | null; submitter_name: string | null; submitter_email: string | null;
};

const when = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" });
const STATUSES = ["submitted", "published", "rejected"] as const;

const RESULTS: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  saved: { tone: "success", text: "Decision saved. Published events appear on the public calendar straight away." },
  stale: { tone: "warning", text: "The decision could not be applied. The event may already have been reviewed, or the service is unavailable." },
  note: { tone: "danger", text: "Add a short note before rejecting an event." },
  invalid: { tone: "danger", text: "That decision was not valid." },
};

export default async function EventsReviewPage({ searchParams }: { searchParams: Promise<{ result?: string; status?: string }> }) {
  const params = await searchParams;
  const status = STATUSES.find((s) => s === params.status) ?? "submitted";
  let denied = false;
  let failed = false;
  let rows: QueueRow[] = [];
  const supabase = await createStaffClient();
  try {
    const [events, articles] = await Promise.all([
      supabase.rpc("has_capability", { p_capability: "events.review" }),
      supabase.rpc("has_capability", { p_capability: "article.publish" }),
    ]);
    if (events.error && articles.error) failed = true;
    else if (events.data !== true && articles.data !== true) denied = true;
    else {
      const queue = await supabase.rpc("staff_event_queue", { p_status: status, p_limit: 100 });
      if (queue.error) failed = true;
      else rows = (queue.data ?? []) as QueueRow[];
    }
  } catch {
    failed = true;
  }
  const result = params.result ? RESULTS[params.result] : undefined;

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        title="Events review"
        description="Community event submissions land here, not in Enquiries. Check the date, venue and organiser before publishing. Submitter contact details are private to staff."
        meta={<StatusBadge>Staff review</StatusBadge>}
      />
      {result ? <Notice tone={result.tone} role={result.tone === "success" ? "status" : "alert"}>{result.text}</Notice> : null}
      <nav className="ui-actions" aria-label="Event status">
        {STATUSES.map((s) => (
          <a key={s} className={s === status ? "btn-primary" : "btn-secondary"} href={`?status=${s}`} aria-current={s === status ? "page" : undefined}>
            {s === "submitted" ? "Waiting for review" : s === "published" ? "Published" : "Rejected"}
          </a>
        ))}
      </nav>
      {denied ? <Notice tone="danger" role="alert">The events.review capability is required. No records are shown.</Notice>
        : failed ? <Notice tone="danger" role="alert">The events queue is unavailable right now. Reload the page to try again.</Notice>
        : rows.length === 0 ? <EmptyPanel title={status === "submitted" ? "No events waiting" : `No ${status} events`} description="New submissions from the public Events page appear here." />
        : (
          <ul className="ui-list ui-stack-sm">
            {rows.map((row) => {
              const image = publicMediaUrl(row.image_key);
              return (
                <li key={row.id}>
                  <Panel className="ui-stack-sm">
                    <div className="ui-row" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {image ? <img src={image} alt={row.image_alt ?? ""} width={160} height={110} style={{ objectFit: "cover", borderRadius: 10, flex: "none" }} /> : null}
                      <div className="ui-stack-sm" style={{ minWidth: 0, flex: "1 1 260px" }}>
                        <h2 className="ui-item-title">{row.title}</h2>
                        <p className="ui-meta">{when.format(new Date(row.starts_at))} – {when.format(new Date(row.ends_at))} WAT{row.venue ? ` · ${row.venue}` : ""}{row.category ? ` · ${row.category}` : ""}</p>
                        {row.description ? <p style={{ whiteSpace: "pre-wrap" }}>{row.description}</p> : null}
                        <p className="ui-meta">
                          Submitted {when.format(new Date(row.created_at))} by {row.submitter_id ? "a member account" : "a guest"}
                          {row.submitter_name ? ` · ${row.submitter_name}` : ""}
                          {row.submitter_email ? <> · <a className="ui-text-link" href={`mailto:${row.submitter_email}`}>{row.submitter_email}</a></> : null}
                        </p>
                      </div>
                    </div>
                    {row.status === "submitted" || row.status === "published" ? (
                      <form action={decideEvent} className="ui-stack-sm">
                        <input type="hidden" name="event_id" value={row.id} />
                        <div className="ui-field">
                          <label className="label" htmlFor={`note-${row.id}`}>Staff note (required to reject)</label>
                          <textarea className="input" id={`note-${row.id}`} name="note" rows={2} maxLength={1000} />
                        </div>
                        <div className="ui-actions">
                          {row.status === "submitted" ? <SubmitButton className="btn-primary" name="decision" value="published">Publish event</SubmitButton> : null}
                          <SubmitButton className="btn-secondary" name="decision" value="rejected">{row.status === "published" ? "Unpublish (reject)" : "Reject"}</SubmitButton>
                        </div>
                      </form>
                    ) : null}
                  </Panel>
                </li>
              );
            })}
          </ul>
        )}
    </PageFrame>
  );
}
