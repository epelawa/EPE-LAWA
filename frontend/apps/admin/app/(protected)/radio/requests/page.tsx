import {  EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../../lib/supabase";
import { decideSongRequest } from "./actions";

export const dynamic = "force-dynamic";

type RequestRow = { id: string; song: string; note: string | null; status: string; created_at: string; programme_name: string | null; member_email: string | null };

const toneByStatus: Record<string, "warning" | "neutral" | "success" | "danger"> = {
  new: "warning",
  queued: "neutral",
  played: "success",
  declined: "danger",
};

export default async function SongRequestsPage({ searchParams }: { searchParams: Promise<{ decided?: string; error?: string }> }) {
  const query = await searchParams;
  const db = await createStaffClient();
  const { data: allowed } = await db.rpc("has_capability", { p_capability: "radio.manage" });
  if (allowed !== true) {
    return <PageFrame className="ui-stack">
      <PageIntro eyebrow="Radio · Staff" title="Song requests" description="Member requests waiting for the radio desk." />
      <Notice tone="danger" role="alert">The radio.manage capability is required to read song requests.</Notice>
    </PageFrame>;
  }

  const { data, error } = await db.rpc("staff_song_requests", { p_state: "all", p_limit: 100 });
  const rows = ((data ?? []) as unknown as RequestRow[]);
  const open = rows.filter(row => row.status === "new" || row.status === "queued");
  const handled = rows.filter(row => row.status === "played" || row.status === "declined");

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Radio · Staff" title="Song requests" description="What members are asking to hear. Mark requests played after airtime, or decline them." />
    {query.decided ? <Notice tone="success" role="status">Song request updated.</Notice> : null}
    {query.error ? <Notice tone="danger" role="alert">That request could not be updated. Refresh and try again.</Notice> : null}

    {error ? <EmptyPanel title="Requests unavailable" description="Song requests could not be loaded. Try again later." />
      : !rows.length ? <EmptyPanel title="No song requests yet" description="Member requests made from the radio page will appear here." />
      : <section className="ui-stack-sm">
        <SectionHeading eyebrow="Queue" title="Waiting on the desk" description="Newest first." />
        {open.length ? <ul className="ui-list ui-stack-sm">{open.map(row => <li key={row.id}><Panel className="ui-stack-sm">
          <div className="ui-row"><StatusBadge tone={toneByStatus[row.status] ?? "neutral"}>{row.status}</StatusBadge><span className="ui-meta">{new Date(row.created_at).toLocaleString("en-NG")}{row.programme_name ? ` · ${row.programme_name}` : ""}</span></div>
          <p className="ui-prose"><strong>{row.song}</strong></p>
          {row.note ? <p className="ui-meta">“{row.note}” — {row.member_email ?? "member"}</p> : null}
          <div className="ui-actions">
            <form action={decideSongRequest}><input type="hidden" name="request_id" value={row.id} /><input type="hidden" name="status" value="queued" /><SubmitButton pendingLabel="Working…" className="btn-secondary" useLegacyClasses useLegacyClasses>Queue for airtime</SubmitButton></form>
            <form action={decideSongRequest}><input type="hidden" name="request_id" value={row.id} /><input type="hidden" name="status" value="played" /><SubmitButton pendingLabel="Working…" className="btn-primary" useLegacyClasses useLegacyClasses>Mark as played</SubmitButton></form>
            <form action={decideSongRequest}><input type="hidden" name="request_id" value={row.id} /><input type="hidden" name="status" value="declined" /><SubmitButton pendingLabel="Working…" className="btn-ghost" useLegacyClasses useLegacyClasses>Decline</SubmitButton></form>
          </div>
        </Panel></li>)}</ul> : <EmptyPanel title="Queue is clear" description="No requests are waiting on the desk." />}

        {handled.length ? <section className="ui-stack-sm pt-4">
          <SectionHeading eyebrow="History" title="Recently handled" description="Requests already resolved at the desk." />
          <ul className="ui-list">{handled.slice(0, 25).map(row => <li key={row.id} className="ui-item"><div className="ui-row"><StatusBadge tone={toneByStatus[row.status] ?? "neutral"}>{row.status}</StatusBadge><span className="ui-meta">{row.song} · {new Date(row.created_at).toLocaleDateString("en-NG")}</span></div></li>)}</ul>
        </section> : null}
      </section>}
  </PageFrame>;
}
