import { SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../../lib/supabase";
import { decideHistoryContribution, resolveHistoryCorrection } from "../../../../lib/history-actions";
import { publicMediaUrl } from "../../../../../main/lib/media";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";

type Contribution = {
  id: string; title: string; account: string; source_description: string;
  source_url: string | null; consent_version: string; consent_text: string;
  consented_at: string; submitted_at: string; community: string | null;
  category: string; family_name: string | null; lineage_description: string | null; rights_description: string;
  contributor_id: string | null; submitter_name: string | null; submitter_email: string | null; image_key: string | null; image_alt: string | null;
};
type CorrectionRequest = { id: string; record_ref: string; request_kind: string; message: string; sender_name: string; sender_email: string; submitter_id: string | null; created_at: string };
const labels: Record<string, string> = { "community-history": "Community history", "family-lineage": "Family / house lineage", "cultural-practice": "Cultural practice", "place-history": "Place history", "oral-history": "Oral history", other: "Other" };

export default async function HistoryReviewPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const supabase = await createStaffClient();
  const [{ data: capability, error: capabilityError }, params] = await Promise.all([
    supabase.rpc("has_capability", { p_capability: "history.review" }), searchParams,
  ]);
  const permitted = !capabilityError && capability === true;
  let rows: Contribution[] = [];
  let corrections: CorrectionRequest[] = [];
  let failed = false;
  let correctionsFailed = false;
  if (permitted) {
    const [queue, requests] = await Promise.all([
      supabase.from("history_contributions")
        .select("id,title,account,source_description,source_url,consent_version,consent_text,consented_at,submitted_at,community,category,family_name,lineage_description,rights_description,contributor_id,submitter_name,submitter_email,image_key,image_alt")
        .eq("status", "pending").order("submitted_at", { ascending: true }).limit(100),
      supabase.from("history_correction_requests")
        .select("id,record_ref,request_kind,message,sender_name,sender_email,submitter_id,created_at")
        .eq("status", "open").order("created_at", { ascending: true }).limit(100),
    ]);
    failed = !!queue.error;
    correctionsFailed = !!requests.error;
    if (queue.error) console.error("history review queue failed", { code: queue.error.code });
    rows = (queue.data ?? []) as Contribution[];
    corrections = (requests.data ?? []) as CorrectionRequest[];
  }

  const resultNotices: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    saved: { tone: "success", text: "Decision recorded." },
    stale: { tone: "warning", text: "This contribution may already have been reviewed. Refresh the queue before taking another action." },
    denied: { tone: "danger", text: "Your account is not authorized to review contributions." },
    invalid: { tone: "danger", text: "The submitted decision was invalid." },
    correction_saved: { tone: "success", text: "Correction request closed." },
    correction_stale: { tone: "warning", text: "That correction request may already be closed. Refresh before acting again." },
    missing_public_text: { tone: "warning", text: "Publishing requires an edited or redacted public account (20–20,000 characters) and an explicitly approved public citation (3–1,000 characters). Only explicitly approved account, family/lineage and citation fields are public. Revision and rejection do not require public text." },
  };
  const notice = params.result ? resultNotices[params.result] : undefined;

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        title="Contribution review"
        description="Review submitted accounts, provenance, consent, lineage context and publication-rights evidence. Only explicitly approved account, family/lineage and citation fields are public; submitted source evidence, rights and consent remain private."
        meta={<StatusBadge tone="neutral">History review</StatusBadge>}
      />
      {notice ? <Notice tone={notice.tone} role={params.result === "saved" ? "status" : "alert"}>{notice.text}</Notice> : null}
      {!permitted ? (
        <EmptyPanel title="Review access required" description="This staff account does not have the history.review capability." />
      ) : failed ? (
        <EmptyPanel title="Queue unavailable" description="Pending contributions could not be verified. Try again later." />
      ) : rows.length === 0 ? (
        <EmptyPanel title="No pending contributions" description="New submissions will appear here for authorized staff." />
      ) : (
        <div className="ui-stack">
          <SectionHeading title="Submissions awaiting review" description="Review private evidence first, then enter only content explicitly approved for public display." />
          {rows.map((row) => (
            <Panel className="ui-stack-sm" key={row.id}>
              <header className="ui-stack-sm">
                <h2 className="ui-item-title">{row.title}</h2>
                <div className="ui-meta">
                  <StatusBadge tone="neutral">{labels[row.category] ?? row.category}</StatusBadge>
                  {row.community ? <span>{row.community}</span> : null}
                  {row.family_name ? <span>{row.family_name} family</span> : null}
                </div>
                <p className="ui-meta">
                  From {row.contributor_id ? "a member account" : "a guest"}{row.submitter_name ? ` · ${row.submitter_name}` : ""}
                  {row.submitter_email ? <> · <a className="ui-text-link" href={`mailto:${row.submitter_email}`}>{row.submitter_email}</a></> : null}
                  {" "}(private)
                </p>
              </header>
              {publicMediaUrl(row.image_key) ? (
                <figure className="ui-stack-sm" style={{ margin: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicMediaUrl(row.image_key) ?? ""} alt={row.image_alt ?? ""} style={{ maxWidth: "min(100%, 420px)", height: "auto", borderRadius: 10 }} />
                  <figcaption className="ui-meta">Submitted photo{row.image_alt ? ` · ${row.image_alt}` : ""}. Not public unless you tick “Publish the submitted photo”.</figcaption>
                </figure>
              ) : null}

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
                  <p className="ui-meta">{row.consent_version}; consented {new Date(row.consented_at).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" })}</p>
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
                {row.image_key ? <label className="ui-row"><input type="checkbox" name="publishImage" value="yes" /> Publish the submitted photo with this record (rights confirmed)</label> : null}
                <div className="ui-actions">
                  <SubmitButton className="btn-primary" name="decision" value="published">Publish verified record</SubmitButton>
                  <SubmitButton className="btn-secondary" name="decision" value="needs_revision">Request revision</SubmitButton>
                  <SubmitButton className="btn-secondary" name="decision" value="rejected">Reject</SubmitButton>
                </div>
              </form>
            </Panel>
          ))}
        </div>
      )}
      {permitted ? (
        <section id="corrections" className="ui-stack" aria-label="Corrections and removal requests">
          <SectionHeading title="Corrections and removal requests" description="Sent from the public “Request a correction” form. Edit the published record separately, then close the request with a note." />
          {correctionsFailed ? <EmptyPanel title="Requests unavailable" description="Correction requests could not be loaded. Try again later." />
            : corrections.length === 0 ? <EmptyPanel title="No open requests" description="New correction and removal requests will appear here." />
            : corrections.map((req) => (
              <Panel className="ui-stack-sm" key={req.id}>
                <h3 className="ui-item-title">{req.record_ref}</h3>
                <p className="ui-prose" style={{ whiteSpace: "pre-wrap" }}>{req.message}</p>
                <p className="ui-meta">{req.sender_name} · <a className="ui-text-link" href={`mailto:${req.sender_email}`}>{req.sender_email}</a>{req.submitter_id ? " · member account" : " · guest"} (private)</p>
                <form action={resolveHistoryCorrection} className="ui-stack-sm">
                  <input type="hidden" name="requestId" value={req.id} />
                  <div className="ui-field">
                    <label className="label" htmlFor={`staff-note-${req.id}`}>Staff note (optional)</label>
                    <textarea className="input" id={`staff-note-${req.id}`} name="staffNote" rows={2} maxLength={2000} />
                  </div>
                  <div className="ui-actions">
                    <SubmitButton className="btn-primary" name="status" value="resolved">Mark resolved</SubmitButton>
                    <SubmitButton className="btn-secondary" name="status" value="dismissed">Dismiss</SubmitButton>
                  </div>
                </form>
              </Panel>
            ))}
        </section>
      ) : null}
    </PageFrame>
  );
}
