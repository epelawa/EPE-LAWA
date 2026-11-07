import { createClient } from "../../../../lib/supabase";
import { decideHistoryContribution } from "../../../../lib/history-actions";

type Contribution = {
  id: string; title: string; account: string; source_description: string;
  source_url: string | null; consent_version: string; consent_text: string;
  consented_at: string; submitted_at: string; community: string | null;
  category: string; family_name: string | null; lineage_description: string | null; rights_description: string;
};
const labels: Record<string, string> = { "community-history": "Community history", "family-lineage": "Family / house lineage", "cultural-practice": "Cultural practice", "place-history": "Place history", "oral-history": "Oral history", other: "Other" };

export default async function HistoryReviewPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const supabase = await createClient();
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

  return (
    <div className="site-main"><div className="ep-container">
      <header className="page-header"><p className="page-header__eyebrow">Itan Ilu Mi</p>
        <h1 className="page-header__title">Contribution review</h1>
        <p className="page-header__lede">Review submitted accounts, provenance, consent, lineage context and publication-rights evidence. Only explicitly approved account, family/lineage and citation fields are public; submitted source evidence, rights and consent remain private.</p>
      </header>
      {params.result === "saved" ? <p role="status" className="admin-dashboard-note">Decision recorded.</p> : null}
      {params.result === "stale" ? <p role="alert" className="admin-dashboard-note">This contribution may already have been reviewed. Refresh the queue before taking another action.</p> : null}
      {params.result === "denied" ? <p role="alert" className="admin-dashboard-note">Your account is not authorized to review contributions.</p> : null}
      {params.result === "invalid" ? <p role="alert" className="admin-dashboard-note">The submitted decision was invalid.</p> : null}
      {params.result === "missing_public_text" ? <p role="alert" className="admin-dashboard-note">Publishing requires an edited or redacted public account (20–20,000 characters) and an explicitly approved public citation (3–1,000 characters). Only explicitly approved account, family/lineage and citation fields are public. Revision and rejection do not require public text.</p> : null}
      {!permitted ? <section className="admin-empty" role="alert"><h2 className="admin-empty__title">Review access required</h2><p className="admin-empty__text">This staff account does not have the history.review capability.</p></section>
        : failed ? <section className="admin-empty" role="alert"><h2 className="admin-empty__title">Queue unavailable</h2><p className="admin-empty__text">Pending contributions could not be verified. Try again later.</p></section>
        : rows.length === 0 ? <section className="admin-empty"><h2 className="admin-empty__title">No pending contributions</h2><p className="admin-empty__text">New submissions will appear here for authorized staff.</p></section>
        : <div className="admin-review-list">{rows.map((row) => <article className="admin-empty" key={row.id}>
          <p className="page-header__eyebrow">Submitted {new Date(row.submitted_at).toLocaleString("en-NG")}</p>
          <h2 className="admin-empty__title">{row.title}</h2><p>{labels[row.category] ?? row.category}{row.community ? ` · ${row.community}` : ""}{row.family_name ? ` · ${row.family_name} family` : ""}</p><p>{row.account}</p>
          {row.lineage_description ? <><h3>Lineage context</h3><p>{row.lineage_description}</p></> : null}
          <h3>Source evidence</h3><p>{row.source_description}</p>
          {row.source_url ? <p><a href={row.source_url} rel="noreferrer">Open submitted source</a></p> : null}
          <h3>Publication rights evidence</h3><p>{row.rights_description}</p>
          <h3>Consent evidence</h3><p>{row.consent_text}</p><p>{row.consent_version}; consented {new Date(row.consented_at).toLocaleString("en-NG")}</p>
          <form action={decideHistoryContribution} className="admin-action-row">
            <input type="hidden" name="contributionId" value={row.id}/>
            <label htmlFor={`public-account-${row.id}`}>Edited/redacted public account (required to publish)</label>
            <textarea id={`public-account-${row.id}`} name="publicAccount" minLength={20} maxLength={20000} rows={8} aria-describedby={`public-account-help-${row.id}`} />
            <p id={`public-account-help-${row.id}`}>Blank by default. Enter the exact text approved for public display; private family details should be removed unless specifically approved.</p>
            <label htmlFor={`public-family-name-${row.id}`}>Public family name (optional)</label>
            <input id={`public-family-name-${row.id}`} name="publicFamilyName" maxLength={180} />
          <label htmlFor={`public-lineage-description-${row.id}`}>Public lineage description (optional)</label>
            <textarea id={`public-lineage-description-${row.id}`} name="publicLineageDescription" maxLength={5000} rows={3} />
            <label htmlFor={`public-citation-${row.id}`}>Public source citation (required to publish, 3–1,000 characters)</label>
            <textarea id={`public-citation-${row.id}`} name="publicCitation" minLength={3} maxLength={1000} rows={2} aria-describedby={`public-citation-help-${row.id}`} />
            <p id={`public-citation-help-${row.id}`}>Blank by default. Enter only the citation approved for public display; this is separate from the contributor’s private source description.</p>
            <label htmlFor={`public-source-url-${row.id}`}>Public source URL (optional, HTTPS only)</label>
            <input id={`public-source-url-${row.id}`} name="publicSourceUrl" type="url" pattern="https://.*" maxLength={1000} placeholder="https://" />
            <p>Blank by default. Only this explicitly approved HTTPS link will be public; the submitted source URL remains private.</p>
            <button className="admin-action admin-action--primary" name="decision" value="published">Publish verified record</button>
            <button className="admin-action" name="decision" value="needs_revision">Request revision</button>
            <button className="admin-action" name="decision" value="rejected">Reject</button>
          </form>
        </article>)}</div>}
    </div></div>
  );
}
