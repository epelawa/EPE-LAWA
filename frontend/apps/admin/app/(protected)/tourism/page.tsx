import { SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { decideTourismSubmission } from "../../../lib/tourism-actions";
import {
  EmptyPanel,
  Notice,
  PageFrame,
  PageIntro,
  Panel,
  SectionHeading,
  StatusBadge,
} from "@epelawa/ui";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Submission = {
  id: string;
  name: string;
  description: string;
  visitor_context: string | null;
  visit_details: string | null;
  source_citation: string;
  source_url: string | null;
  media_url: string | null;
  media_rights: string | null;
  submitted_at: string;
  submitter_name: string | null;
  submitter_email: string | null;
  contributor_id: string | null;
};

export default async function TourismReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const params = await searchParams;
  let denied = false;
  let failed = false;
  let rows: Submission[] = [];

  const supabase = await createStaffClient();

  try {
    const cap = await supabase.rpc("has_capability", {
      p_capability: "tourism.review",
    });
    if (cap.error) failed = true;
    else if (cap.data !== true) denied = true;
    else {
      const result = await supabase
        .from("tourism_submissions")
        .select(
          "id,name,description,visitor_context,visit_details,source_citation,source_url,media_url,media_rights,submitted_at,submitter_name,submitter_email,contributor_id",
        )
        .eq("status", "pending")
        .order("submitted_at")
        .limit(100);
      if (result.error) failed = true;
      else rows = (result.data ?? []) as Submission[];
    }
  } catch {
    failed = true;
  }

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        title="Historical Sites &amp; Tourism review"
        description="Review source provenance and publication rights before making a destination public. Hours, prices, access and directions require separate verification. This queue never publishes automatically."
        meta={<StatusBadge>Staff review</StatusBadge>}
      />

      {params.result === "saved" ? (
        <Notice tone="success" role="status">
          Review decision saved.
        </Notice>
      ) : null}
      {params.result === "stale" ? (
        <Notice tone="warning" role="alert">
          The decision could not be applied. The submission may already have been reviewed or the service is unavailable.
        </Notice>
      ) : null}

      {params.result === "denied" || denied ? (
        <EmptyPanel
          title="Tourism review access required"
          description="This staff account does not have the tourism.review capability."
        />
      ) : failed ? (
        <EmptyPanel
          title="Review queue unavailable"
          description="The queue could not be verified. No submission data is shown."
        />
      ) : rows.length === 0 ? (
        <EmptyPanel
          title="No pending Tourism submissions"
          description="The queue currently has no pending records."
        />
      ) : (
        <ol className="ui-list ui-stack">
          {rows.map((row) => (
            <li key={row.id}>
              <Panel className="ui-stack">
                <div className="ui-meta">
                  <span>
                    Submitted{" "}
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    }).format(new Date(row.submitted_at))}
                  </span>
                  <StatusBadge tone="warning">Pending review</StatusBadge>
                </div>
                <SectionHeading title={row.name} />
                <p className="ui-meta">
                  From {row.contributor_id ? "a member account" : "a guest"}{row.submitter_name ? ` · ${row.submitter_name}` : ""}
                  {row.submitter_email ? <> · <a className="ui-text-link" href={`mailto:${row.submitter_email}`}>{row.submitter_email}</a></> : null} (private)
                </p>
                <div className="ui-prose">
                  <p className="whitespace-pre-wrap">{row.description}</p>
                  {row.visitor_context ? (
                    <p className="whitespace-pre-wrap">
                      <strong>Visitor context:</strong> {row.visitor_context}
                    </p>
                  ) : null}
                  {row.visit_details ? (
                    <p className="whitespace-pre-wrap">
                      <strong>Proposed visit details:</strong> {row.visit_details}
                    </p>
                  ) : null}
                </div>

                <section className="ui-subtle ui-stack-sm" aria-labelledby={`evidence-${row.id}`}>
                  <SectionHeading
                    title="Provenance and rights evidence"
                    id={`evidence-${row.id}`}
                  />
                  <p>
                    {row.source_url ? (
                      <a href={row.source_url} rel="noreferrer">
                        {row.source_citation}
                      </a>
                    ) : (
                      row.source_citation
                    )}
                  </p>
                  {row.media_url ? (
                    <p>
                      Media: {" "}
                      <a href={row.media_url} rel="noreferrer">
                        Open submitted media
                      </a>
                      . Rights basis: {row.media_rights || "Not supplied"}
                    </p>
                  ) : (
                    <p>No media supplied.</p>
                  )}
                </section>

                <form action={decideTourismSubmission} className="ui-stack">
                  <input type="hidden" name="submission_id" value={row.id} />
                  <fieldset className="ui-form-grid">
                    <legend>
                      Details to publish, only where personally verified
                    </legend>
                    <div className="ui-field">
                      <label className="label" htmlFor={`slug-${row.id}`}>
                        Canonical slug (required to publish)
                      </label>
                      <input
                        className="input"
                        id={`slug-${row.id}`}
                        name="slug"
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        maxLength={180}
                      />
                    </div>
                    <div className="ui-field">
                      <label className="label" htmlFor={`location-${row.id}`}>
                        Location label
                      </label>
                      <input className="input" id={`location-${row.id}`} name="location_label" maxLength={300} />
                    </div>
                    <div className="ui-field">
                      <label className="label" htmlFor={`directions-${row.id}`}>
                        Verified map search phrase
                      </label>
                      <input className="input" id={`directions-${row.id}`} name="directions_query" maxLength={300} />
                    </div>
                    <div className="ui-form-grid">
                      <div className="ui-field">
                        <label className="label" htmlFor={`lat-${row.id}`}>
                          Verified latitude
                        </label>
                        <input className="input" id={`lat-${row.id}`} name="latitude" type="number" step="any" min="-90" max="90" />
                      </div>
                      <div className="ui-field">
                        <label className="label" htmlFor={`lon-${row.id}`}>
                          Verified longitude
                        </label>
                        <input className="input" id={`lon-${row.id}`} name="longitude" type="number" step="any" min="-180" max="180" />
                      </div>
                    </div>
                    {[["opening_hours", "Opening hours"], ["price_details", "Prices"], ["access_details", "Access details"]].map(([name, label]) => (
                      <div className="ui-field" key={name}>
                        <label className="label" htmlFor={`${name}-${row.id}`}>
                          {label}
                        </label>
                        <textarea className="input" id={`${name}-${row.id}`} name={name} maxLength={1000} rows={3} />
                      </div>
                    ))}
                  </fieldset>

                  <label className="ui-row">
                    <input type="checkbox" name="provenance_verified" value="yes" />
                    <span>I independently checked the cited source and provenance for this destination.</span>
                  </label>
                  <label className="ui-row">
                    <input type="checkbox" name="rights_verified" value="yes" />
                    <span>I verified publication rights for the submitted content and any media attached.</span>
                  </label>
                  <p className="ui-muted">
                    Coordinates are not required. If supplied, verify them against a reliable source. Leave unknown visitor fields blank.
                  </p>
                  <div className="ui-actions">
                    <SubmitButton className="btn-primary" name="decision" value="published">
                      Verify &amp; publish
                    </SubmitButton>
                    <SubmitButton className="btn-secondary" name="decision" value="needs_revision">
                      Request revision
                    </SubmitButton>
                    <SubmitButton className="btn-secondary" name="decision" value="rejected">
                      Reject
                    </SubmitButton>
                  </div>
                </form>
              </Panel>
            </li>
          ))}
        </ol>
      )}
    </PageFrame>
  );
}
