import { createClient } from "../../../lib/supabase";
import {
  EmptyPanel,
  Notice,
  PageFrame,
  PageIntro,
  Panel,
  SectionHeading,
  StatusBadge,
} from "@epelawa/ui";
import { createPlacement, endPlacement } from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SearchParams = Promise<{ result?: string }>;

function resultNotice(result?: string) {
  if (result === "created")
    return (
      <Notice tone="success" role="status">
        Placement created. It will appear publicly only during its verified
        window.
      </Notice>
    );
  if (result === "ended")
    return (
      <Notice tone="success" role="status">
        Placement ended and recorded in the audit trail.
      </Notice>
    );
  if (result === "failed")
    return (
      <Notice tone="danger" role="alert">
        The placement action was rejected. Confirm the payment is successful and
        verified, the business is published, and the dates do not overlap.
      </Notice>
    );
  if (result === "invalid")
    return (
      <Notice tone="danger" role="alert">
        The placement details were incomplete or invalid. No change was made.
      </Notice>
    );
  return null;
}

export default async function AdvertisingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const db = await createClient();
  const capability = await db.rpc("has_capability", {
    p_capability: "advertising.manage",
  });
  if (capability.error || capability.data !== true)
    return (
      <PageFrame className="ui-stack">
        <PageIntro
          eyebrow="Commercial · Staff"
          title="Advertising"
          description="Manage payment-verified sponsorship windows across the publication."
        />
        <Notice tone="danger" role="alert">
          The advertising.manage capability is required. No placement or payment
          data is shown.
        </Notice>
      </PageFrame>
    );

  const [
    { data: placements, error: placementsError },
    { data: businesses, error: businessesError },
  ] = await Promise.all([
    db
      .from("business_featured")
      .select("id,business_id,starts_at,ends_at,created_at")
      .order("starts_at", { ascending: false })
      .limit(100),
    db
      .from("published_businesses")
      .select("id,name,slug")
      .order("name")
      .limit(200),
  ]);
  const businessMap = new Map(
    (businesses ?? []).map((business) => [business.id, business]),
  );
  const loadFailed = !!placementsError || !!businessesError;
  const now = Date.now();
  const active = (placements ?? []).filter(
    (placement) =>
      new Date(placement.starts_at).getTime() <= now &&
      new Date(placement.ends_at).getTime() > now,
  );
  const upcoming = (placements ?? []).filter(
    (placement) => new Date(placement.starts_at).getTime() > now,
  );

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="Commercial · Staff"
        title="Advertising"
        description="Create and end business sponsorship windows only after a successful provider payment has been verified."
      />
      {resultNotice(params.result)}
      {loadFailed ? (
        <EmptyPanel
          title="Advertising data unavailable"
          description="No placement details are shown. Refresh and retry; no change was made."
        />
      ) : (
        <>
          <section className="ui-stack-sm">
            <SectionHeading
              eyebrow="New placement"
              title="Book a verified sponsorship window"
              description="The server resolves the newest successful, verified payment connected to the selected business. No payment or provider identifiers are sent to the browser."
            />
            <Panel>
              <form action={createPlacement} className="ui-stack-sm">
                <div className="ui-form-grid">
                  <label className="ui-field">
                    <span className="label">Published business</span>
                    <select
                      name="business_id"
                      className="input"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select a business
                      </option>
                      {(businesses ?? []).map((business) => (
                        <option key={business.id} value={business.id}>
                          {business.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ui-field">
                    <span className="label">Starts</span>
                    <input
                      name="starts_at"
                      type="datetime-local"
                      className="input"
                      required
                    />
                  </label>
                  <label className="ui-field">
                    <span className="label">Ends</span>
                    <input
                      name="ends_at"
                      type="datetime-local"
                      className="input"
                      required
                    />
                  </label>
                </div>
                <p className="ui-muted">
                  No payment is created or marked successful by this form. The
                  database rejects unverified payments, unpublished businesses,
                  overlapping windows, and windows longer than 366 days.
                </p>
                <div className="ui-actions">
                  <button className="btn-primary" type="submit">
                    Create placement
                  </button>
                </div>
              </form>
            </Panel>
          </section>
          <section className="ui-stack-sm">
            <SectionHeading
              eyebrow="Live now"
              title="Active placements"
              description="These placements are eligible for the public sponsor cards."
            />
            {!active.length ? (
              <EmptyPanel
                title="No active placements"
                description="A clearly labelled Advertise here invitation is shown publicly until a verified placement is active."
              />
            ) : (
              <ul className="ui-list ui-stack-sm">
                {active.map((placement) => {
                  const business = businessMap.get(placement.business_id);
                  return (
                    <li key={placement.id}>
                      <Panel className="ui-stack-sm">
                        <div className="ui-row">
                          <StatusBadge tone="success">Active</StatusBadge>
                          <span className="ui-meta">
                            Ends{" "}
                            {new Date(placement.ends_at).toLocaleString(
                              "en-NG",
                            )}
                          </span>
                        </div>
                        <h3 className="ui-item-title">
                          {business?.name ?? "Published business unavailable"}
                        </h3>
                        <p className="ui-muted">
                          The public card links to the verified business
                          directory profile. Payment details remain outside this
                          public surface.
                        </p>
                        <form action={endPlacement}>
                          <input
                            type="hidden"
                            name="placement_id"
                            value={placement.id}
                          />
                          <button className="btn-secondary" type="submit">
                            End placement
                          </button>
                        </form>
                      </Panel>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="ui-stack-sm">
            <SectionHeading
              eyebrow="Scheduled"
              title="Upcoming placements"
              description="Future windows are held until their start time."
            />
            {!upcoming.length ? (
              <p className="ui-muted">No upcoming placements.</p>
            ) : (
              <ul className="ui-list ui-stack-sm">
                {upcoming.map((placement) => (
                  <li key={placement.id}>
                    <Panel>
                      <div className="ui-row">
                        <StatusBadge tone="neutral">Scheduled</StatusBadge>
                        <span>
                          {businessMap.get(placement.business_id)?.name ??
                            "Published business unavailable"}
                        </span>
                      </div>
                      <p className="ui-meta">
                        {new Date(placement.starts_at).toLocaleString("en-NG")}{" "}
                        → {new Date(placement.ends_at).toLocaleString("en-NG")}
                      </p>
                    </Panel>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </PageFrame>
  );
}
