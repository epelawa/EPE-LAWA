import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { decideMapCorrection } from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Submission = {
  id: string;
  place_name: string;
  details: string;
  directions_query: string | null;
  source_note: string | null;
  source_url: string | null;
  submitted_at: string;
};

export default async function MapCorrectionsPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const params = await searchParams;
  let denied = false;
  let failed = false;
  let rows: Submission[] = [];
  const supabase = await createStaffClient();

  try {
    const capability = await supabase.rpc("has_capability", { p_capability: "map.review" });
    if (capability.error) failed = true;
    else if (capability.data !== true) denied = true;
    else {
      const result = await supabase.from("map_correction_submissions")
        .select("id,place_name,details,directions_query,source_note,source_url,submitted_at")
        .eq("status", "pending").order("submitted_at").limit(100);
      if (result.error) failed = true;
      else rows = (result.data ?? []) as Submission[];
    }
  } catch {
    failed = true;
  }

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Map · Staff review" title="Map corrections" description="Check every visitor suggestion against reliable evidence. Approval publishes only the verified, staff-edited record to the assistant's approved knowledge source." />
    {params.result === "saved" ? <Notice tone="success" role="status">Decision recorded.</Notice> : null}
    {params.result === "stale" ? <Notice tone="warning" role="alert">Decision failed; the submission may already have been reviewed. Reload the queue.</Notice> : null}
    {params.result === "denied" || denied ? <EmptyPanel title="Map review access required" description="This staff account does not have the map.review capability. No submission details are shown." /> : failed ? <EmptyPanel title="Review queue unavailable" description="The queue could not be verified. No submission details are shown." /> : rows.length === 0 ? <EmptyPanel title="No pending corrections" description="Visitor submissions remain private unless approved here." /> :
      <ol className="ui-list ui-stack">{rows.map((row) => <li key={row.id}>
        <Panel className="ui-stack">
          <div className="ui-row"><StatusBadge tone="warning">Pending · private</StatusBadge><span className="ui-meta">{new Date(row.submitted_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</span></div>
          <SectionHeading title={row.place_name} />
          <p className="ui-prose whitespace-pre-wrap">{row.details}</p>
          {row.directions_query ? <p><strong>Suggested search phrase:</strong> {row.directions_query}</p> : <p className="ui-meta">No search phrase supplied.</p>}
          {row.source_note ? <p><strong>Submitter source note:</strong> {row.source_note}</p> : <p className="ui-meta">No supporting source note supplied.</p>}
          {row.source_url ? <p><a className="ui-text-link" href={row.source_url} rel="noreferrer">Open submitted HTTPS source</a></p> : <p className="ui-meta">No source URL supplied. Verify independently before approval.</p>}
          <form action={decideMapCorrection} className="ui-stack-sm ui-divider">
            <input type="hidden" name="submission_id" value={row.id} />
            <SectionHeading eyebrow="Human verification" title="Confirm or correct each field before approval" />
            <div className="ui-form-grid">
              <label className="ui-field"><span className="label">Verified place name</span><input name="place_name" defaultValue={row.place_name} required maxLength={180} className="input" /></label>
              <label className="ui-field"><span className="label">Canonical directions/search phrase</span><input name="directions_query" defaultValue={row.directions_query ?? ""} required maxLength={500} className="input" /></label>
              <label className="ui-field"><span className="label">Verified details</span><textarea name="details" defaultValue={row.details} required maxLength={4000} className="input" /></label>
              <label className="ui-field"><span className="label">Verified source note</span><textarea name="source_note" defaultValue={row.source_note ?? ""} required minLength={5} maxLength={1200} className="input" /></label>
              <label className="ui-field"><span className="label">Canonical HTTPS source URL</span><input name="source_url" type="url" required pattern="https://.*" defaultValue={row.source_url ?? ""} maxLength={2000} className="input" /></label>
              <label className="ui-field"><span className="label">Verified latitude (optional)</span><input name="latitude" type="number" min="6.4" max="6.76" step="0.000001" className="input" /></label>
              <label className="ui-field"><span className="label">Verified longitude (optional)</span><input name="longitude" type="number" min="3.6" max="4.37" step="0.000001" className="input" /></label>
            </div>
            <p className="ui-meta">Coordinates are optional. If you enter one, enter both and verify them from a reliable source within the Epe Division bounds.</p>
            <div className="ui-row">
              <SubmitButton pendingLabel="Saving…" className="btn-primary" useLegacyClasses name="decision" value="approve">Approve verified information</SubmitButton>
              <button className="btn-secondary" name="decision" value="reject" formAction={decideMapCorrection}>Reject</button>
            </div>
          </form>
        </Panel>
      </li>)}</ol>}
  </PageFrame>;
}
