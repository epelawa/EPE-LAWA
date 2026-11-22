import { createStaffClient } from "../../../../lib/supabase";
import { decideHistoryContribution } from "../../../../lib/history-actions";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";

type Contribution = {
  id: string; title: string; account: string; source_description: string;
  source_url: string | null; consent_version: string; consent_text: string;
  consented_at: string; submitted_at: string; community: string | null;
  category: string; family_name: string | null; lineage_description: string | null; rights_description: string;
};
const labels: Record<string, string> = { "community-history": "Community history", "family-lineage": "Family / house lineage", "cultural-practice": "Cultural practice", "place-history": "Place history", "oral-history": "Oral history", other: "Other" };

export default async function HistoryReviewPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const supabase = await createStaffClient();
  const [{ data: capability, error: capabilityError }, params] = await Promise.all([
    supabase.rpc("has_capability", { p_capability: "history.review" }), searchParams,
  ]);
  const permitted = !capabilityError && capability === true;
  let rows: Contribution[] = [];
  let failed = false;
  if (permitted) {
    const { data, error } = await supabase.from("history_contributions")
      .select("id,title,account,source_description,source_url,consent_version,consent_text,consented_at,submitted_at,community,category,family_name,lineage_description,rights_description")
      .eq("status", "pending").order("submitted_at", { ascending: true }).limit(100);
    failed = !!error;
    if (error) console.error("history review queue failed", { code: error.code });
    rows = (data ?? []) as Contribution[];
  }

  const resultNotices: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    saved: { tone: "success", text: "Decision recorded." },
    stale: { tone: "warning", text: "This contribution may already have been reviewed. Refresh the queue before taking another action." },
    denied: { tone: "danger", text: "Your account is not authorized to review contributions." },
    invalid: { tone: "danger", text: "The submitted decision was invalid." },
    missing_public_text: { tone: "warning", text: "Publishing requires an edited or redacted public account (20–20,000 characters) and an explicitly approved public citation (3–1,000 characters). Only explicitly approved account, family/lineage and citation fields are public. Revision and rejection do not require public text." },
  };
  const notice = params.result ? resultNotices[params.result] : undefined;

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="Itan Ilu Mi · Staff"
        title="Contribution review"
        description="Review submitted accounts, provenance, consent, lineage context and publication-rights evidence. Only explicitly approved account, family/lineage and citation fields are public; submitted source evidence, rights and consent remain private."
        meta={<StatusBadge tone="neutral">History review</StatusBadge>}
      />
      {notice ? <Notice tone={notice.tone} role={params.result === "saved" ? "status" : "alert"}>{notice.text}</Notice> : null}
      <Notice tone="warning" role="note">
        <div className="ui-stack-sm">
          <div className="ui-row"><StatusBadge tone="warning">Unavailable</StatusBadge><strong>Published-record corrections and removals</strong></div>
          <p>This queue accepts new contributions only. It cannot receive correction/removal reports or edit or withdraw a published record. No safe, persisted correction workflow is available; do not process such requests here.</p>
        </div>
      </Notice>
      {!permitted ? (
        <EmptyPanel title="Review access required" description="This staff account does not have the history.review capability." />
      ) : failed ? (
        <EmptyPanel title="Queue unavailable" description="Pending contributions could not be verified. Try again later." />
      ) : rows.length === 0 ? (
        <EmptyPanel title="No pending contributions" description="New submissions will appear here for authorized staff." />
      ) : (
        <div className="ui-stack">
          <SectionHeading eyebrow="Pending queue" title="Submissions awaiting review" description="Review private evidence first, then enter only content explicitly approved for public display." />
          {rows.map((row) => (
            <Panel className="ui-stack-sm" key={row.id}>
              <header className="ui-stack-sm">
                <p className="ui-eyebrow">Submitted {new Date(row.submitted_at).toLocaleString("en-NG")}</p>
                <h2 className="ui-item-title">{row.title}</h2>
                <div className="ui-meta">
                  <StatusBadge tone="neutral">{labels[row.category] ?? row.category}</StatusBadge>
                  {row.community ? <span>{row.community}</span> : null}
                  {row.family_name ? <span>{row.family_name} family</span> : null}
                </div>
              </header>

              <section className="ui-subtle ui-stack-sm" aria-label="Private submission details">
                <SectionHeading title="Submitted account" />
                <p className="ui-prose">{row.account}</p>
                {row.lineage_description ? <><h3>Lineage context</h3><p className="ui-prose">{row.lineage_description}</p></> : null}
              </section>

              <div className="ui-grid ui-grid--2">
                <section className="ui-card ui-stack-sm">
                  <h3>Source evidence · private</h3>
                  <p className="ui-prose">{row.source_description}</p>
                  {row.source_url ? <p><a className="ui-text-link" href={row.source_url} rel="noreferrer">Open submitted source</a></p> : null}
                </section>
                <section className="ui-card ui-stack-sm">
                  <h3>Publication rights evidence · private</h3>
                  <p className="ui-prose">{row.rights_description}</p>
                </section>
                <section className="ui-card ui-stack-sm">
                  <h3>Consent evidence · private</h3>
                  <p className="ui-prose">{row.consent_text}</p>
                  <p className="ui-meta">{row.consent_version}; consented {new Date(row.consented_at).toLocaleString("en-NG")}</p>
                </section>
              </div>

              <form action={decideHistoryContribution} className="ui-stack-sm">
                <input type="hidden" name="contributionId" value={row.id}/>
                <SectionHeading title="Approved public version" description="Blank by default. Public fields are recorded separately from private submission evidence. Remove private family details unless specifically approved." />
                <div className="ui-form-grid">
                  <div className="ui-field">
                    <label className="label" htmlFor={`public-account-${row.id}`}>Edited/redacted public account (required to publish)</label>
                    <textarea className="input" id={`public-account-${row.id}`} name="publicAccount" minLength={20} maxLength={20000} rows={8} aria-describedby={`public-account-help-${row.id}`} />
                    <p className="ui-muted" id={`public-account-help-${row.id}`}>Enter the exact text approved for public display (20–20,000 characters).</p>
                  </div>
                  <div className="ui-field">
                    <label className="label" htmlFor={`public-family-name-${row.id}`}>Public family name (optional)</label>
                    <input className="input" id={`public-family-name-${row.id}`} name="publicFamilyName" maxLength={180} />
                    <label className="label" htmlFor={`public-lineage-description-${row.id}`}>Public lineage description (optional)</label>
                    <textarea className="input" id={`public-lineage-description-${row.id}`} name="publicLineageDescription" maxLength={5000} rows={3} />
                  </div>
                  <div className="ui-field">
                    <label className="label" htmlFor={`public-citation-${row.id}`}>Public source citation (required to publish, 3–1,000 characters)</label>
                    <textarea className="input" id={`public-citation-${row.id}`} name="publicCitation" minLength={3} maxLength={1000} rows={3} aria-describedby={`public-citation-help-${row.id}`} />
                    <p className="ui-muted" id={`public-citation-help-${row.id}`}>Enter only the citation approved for public display; this is separate from the contributor’s private source description.</p>
                  </div>
                  <div className="ui-field">
                    <label className="label" htmlFor={`public-source-url-${row.id}`}>Public source URL (optional, HTTPS only)</label>
                    <input className="input" id={`public-source-url-${row.id}`} name="publicSourceUrl" type="url" pattern="https://.*" maxLength={1000} placeholder="https://" />
                    <p className="ui-muted">Blank by default. Only this explicitly approved HTTPS link will be public; the submitted source URL remains private.</p>
                  </div>
                </div>
                <div className="ui-actions">
                  <button className="btn-primary" name="decision" value="published">Publish verified record</button>
                  <button className="btn-secondary" name="decision" value="needs_revision">Request revision</button>
                  <button className="btn-secondary" name="decision" value="rejected">Reject</button>
                </div>
              </form>
            </Panel>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
