import { createStaffClient } from "../../../lib/supabase";
import { parseBusinessHours, hourRows, businessOpenNow } from "../../../lib/business-hours";
import { reviewBusiness, decideBusinessClaim, featureBusiness, deleteBusiness } from "./actions";
import BusinessCreateForm from "../../../components/business-create-form";
import BusinessEditForm from "../../../components/business-edit-form";
import ConfirmSubmit from "../../../components/confirm-submit";
import { SubmitButton } from "@epelawa/ui";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";

type PublishedRow = {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  description: string | null;
  area: string | null;
  address: string | null;
  landmark: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  logo_key: string | null;
  hours: unknown;
  created_at: string;
};

export const dynamic = "force-dynamic";

type ClaimRow = {
  id: string;
  message: string;
  status: string;
  decision_note: string | null;
  created_at: string;
  businesses: { name: string | null } | null;
};

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string; added?: string; claims?: string; featured?: string; deleted?: string }> }) {
  const p = await searchParams;
  const db = await createStaffClient();
  const { data: allowed, error: ge } = await db.rpc("has_capability", { p_capability: "business.review" });
  if (ge || allowed !== true) return <PageFrame className="ui-stack"><PageIntro eyebrow="Business Directory · Staff" title="Business submissions" description="Review and verify new business listings." /><Notice tone="danger" role="alert">Business review capability is required to access this queue.</Notice></PageFrame>;
  const { data, error } = await db.from("businesses").select("id,name,category_id,description,area,address,landmark,phone,whatsapp,email,website,status,created_at,hours").in("status", ["submitted", "reviewing"]).is("deleted_at", null).order("created_at").limit(100);
  const { data: cats } = await db.from("business_categories").select("id,label").limit(100);
  const [claimsResult, featuredResult, publishedResult] = await Promise.all([
    db.from("business_claims").select("id,business_id,message,status,decision_note,created_at,businesses(name)").in("status", ["open"]).order("created_at", { ascending: false }).limit(50),
    db.from("business_featured").select("business_id,starts_at,ends_at,businesses(name,slug)").gt("ends_at", new Date().toISOString()).order("ends_at", { ascending: false }).limit(1),
    db.from("businesses").select("id,slug,name,category_id,description,area,address,landmark,phone,whatsapp,email,website,logo_key,hours,created_at,status").eq("status", "published").is("deleted_at", null).order("name").limit(200),
  ]);
  const claims = ((claimsResult.data ?? []) as unknown as ClaimRow[]);
  const featuredNow = (featuredResult.data ?? []) as unknown as { businesses: { name: string; slug: string } | null; ends_at: string }[];
  const publishedBusinesses = (publishedResult.data ?? []) as unknown as PublishedRow[];
  const labels = new Map((cats ?? []).map(c => [c.id, c.label]));
  // Private submitter contact (guest name/email) for queued listings.
  const submitterRows = data?.length ? (await db.rpc("staff_business_submitters", { p_ids: data.map(b => b.id) })).data : null;
  const submitters = new Map(((submitterRows ?? []) as { business_id: string; submitter_name: string | null; submitter_email: string | null }[]).map(r => [r.business_id, r]));
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Business Directory · Staff" title="Business submissions" description="Review unpublished submissions, record evidence, then publish or reject with a reason." />
    {p.error ? <Notice tone="danger" role="alert">Review action failed. Confirm evidence and capability, then retry.</Notice> : null}
    {p.updated ? <Notice tone="success" role="status">Review action recorded.</Notice> : null}
    {p.added ? <Notice tone="success" role="status">Listing published — it is now visible in the public business directory.</Notice> : null}
    {p.claims ? <Notice tone="success" role="status">Claim decision recorded.</Notice> : null}
    {p.featured ? <Notice tone="success" role="status">The featured directory slot now points at the chosen business.</Notice> : null}
    {p.error === "claim" ? <Notice tone="danger" role="alert">The claim decision needs status, a note for rejections and business.review access.</Notice> : null}
    {p.error === "featured" ? <Notice tone="danger" role="alert">Choose a published business and a run of 1–90 days to fill the featured slot.</Notice> : null}
    {p.deleted ? <Notice tone="success" role="status">The listing was removed completely — it no longer appears anywhere on the platform.</Notice> : null}
    {p.error === "delete" ? <Notice tone="danger" role="alert">To remove a listing, write a reason of at least 5 characters.</Notice> : null}
    {p.error === "delete-failed" ? <Notice tone="danger" role="alert">The listing could not be deleted. Confirm your business.review access, reload and try again; nothing was removed.</Notice> : null}

    <section className="ui-stack-sm">
      <SectionHeading eyebrow="Published listings" title="Live listings" description={`${publishedBusinesses.length} published ${publishedBusinesses.length === 1 ? "listing" : "listings"} · expand one to edit its details or remove it completely.`} />
      {!publishedBusinesses.length ? <EmptyPanel title="No published listings" description="Listings appear here as soon as they are published, including the ones you add directly." /> : <ul className="ui-list ui-stack-sm">{publishedBusinesses.map((b) => { const hours = parseBusinessHours(b.hours); const rows = hourRows(hours).filter((row) => row.range); return <li key={b.id}><Panel className="ui-stack-sm">
        <div className="ui-row">
          <div className="ui-stack-sm">
            <h3 className="ui-item-title">{b.name}</h3>
            <p className="ui-meta">{labels.get(b.category_id) ?? "Category"}{b.area ? ` · ${b.area}` : ""} · /business-directory/{b.slug}{rows.length ? ` · ${rows.map((row) => `${row.label} ${row.range}`).join(" · ")}` : ""}</p>
          </div>
          <StatusBadge tone="success">published</StatusBadge>
        </div>
        <details className="ui-stack-sm">
          <summary className="btn-ghost" style={{ width: "fit-content" }}>Edit this listing</summary>
          <div className="ui-divider">
            <BusinessEditForm
              categories={cats ?? []}
              business={{
                id: b.id,
                name: b.name ?? "",
                category_id: b.category_id ?? "",
                description: b.description ?? "",
                area: b.area ?? "",
                address: b.address ?? "",
                landmark: b.landmark ?? "",
                phone: b.phone ?? "",
                whatsapp: b.whatsapp ?? "",
                email: b.email ?? "",
                website: b.website ?? "",
                hours_json: b.hours && typeof b.hours === "object" ? JSON.stringify(b.hours) : "",
                logo_url: b.logo_key && /^https?:\/\//.test(b.logo_key) ? b.logo_key : "",
              }}
            />
          </div>
        </details>
        <form action={deleteBusiness} className="ui-stack-sm ui-divider">
          <input type="hidden" name="business_id" value={b.id} />
          <label className="ui-field"><span className="label">Deletion reason (kept in the audit record, at least 5 characters)</span><textarea name="reason" required minLength={5} maxLength={1000} className="input" /></label>
          <div className="ui-actions"><ConfirmSubmit message={`Remove ${b.name} completely? Its photos, reviews, claims, verification records and featured slots are deleted with it and cannot be recovered.`} confirmLabel="Delete listing" className="btn-danger">Delete listing</ConfirmSubmit></div>
        </form>
      </Panel></li>; })}</ul>}
    </section>
    {cats?.length ? <Panel><SectionHeading eyebrow="Direct listing" title="Add a business" description="Publish a listing yourself, right now — no submission needed. Everything you save here appears in the public directory immediately." /><BusinessCreateForm categories={cats} /></Panel> : null}

    <section className="ui-stack-sm">
      <SectionHeading eyebrow="Ownership claims" title="Business claims" description="Members who say they run a listing. Approving the claim links their account as owner; reject with a reason otherwise." />
      {!claims.length ? <EmptyPanel title="No open claims" description="Claim requests appear here when members use the claim action on a listing." /> : <ul className="ui-list ui-stack-sm">{claims.map(claim => <li key={claim.id}><Panel className="ui-stack-sm">
        <div className="ui-row"><StatusBadge tone="warning">open</StatusBadge><span className="ui-meta">Received {new Date(claim.created_at).toLocaleString("en-NG")}</span></div>
        <p className="ui-prose">{claim.message}</p>
        <form action={decideBusinessClaim} className="ui-stack-sm ui-divider">
          <input type="hidden" name="claim_id" value={claim.id} />
          <div className="ui-form-grid">
            <label className="ui-field"><span className="label">Decision</span><select name="status" required defaultValue="" className="input"><option value="" disabled>Choose a decision</option><option value="approved">Approve — link the member as owner</option><option value="rejected">Reject — with a reason</option></select></label>
            <label className="ui-field"><span className="label">Decision note (required when rejecting)</span><textarea name="note" maxLength={1000} className="input" /></label>
          </div>
          <div className="ui-actions"><SubmitButton className="btn-primary">Record claim decision</SubmitButton></div>
        </form>
      </Panel></li>)}</ul>}
    </section>

    <Panel className="ui-subtle">
      <SectionHeading eyebrow="Featured slot" title="Featured business placement" description="One listing at a time is highlighted at the top of the public directory for the chosen days. Placement is paid offline; record the arrangement before switching the slot." />
      {featuredNow.length ? <p className="ui-meta">Now featured: <strong>{featuredNow[0].businesses?.name ?? "Unknown"}</strong> until {new Date(featuredNow[0].ends_at).toLocaleString("en-NG")}</p> : <p className="ui-meta">The featured slot is empty.</p>}
      <form action={featureBusiness} className="ui-stack-sm ui-divider">
        <div className="ui-form-grid">
          <label className="ui-field"><span className="label">Business</span><select name="business_id" required defaultValue="" className="input"><option value="" disabled>Choose a published business</option>{publishedBusinesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label className="ui-field"><span className="label">Run for (days)</span><input className="input" name="days" type="number" min={1} max={90} defaultValue={7} required /></label>
        </div>
        <div className="ui-actions"><SubmitButton className="btn-primary">Feature this business</SubmitButton></div>
      </form>
    </Panel>
    {error ? <EmptyPanel title="Queue unavailable" description="No listing details are shown. Try again later." /> : !data?.length ? <EmptyPanel title="No submissions awaiting review" description="New business submissions will appear here for staff review." /> : <section className="ui-stack-sm"><SectionHeading eyebrow="Review queue" title="Pending submissions" description="Review each listing and record a clear, auditable decision." action={<a className="btn-secondary" href="/admin/business-review/export">Download CSV</a>} />
      <ul className="ui-list ui-stack-sm">{data.map(b => <li key={b.id}><Panel className="ui-stack-sm">
        <div className="ui-row"><StatusBadge tone={b.status === "submitted" ? "warning" : "neutral"}>{b.status}</StatusBadge><span className="ui-meta">{labels.get(b.category_id) ?? "Category"} · Received {new Date(b.created_at).toLocaleString("en-NG")}</span></div>
        <div><h2 className="ui-item-title">{b.name}</h2><p className="ui-prose">{b.description || "No description provided."}</p></div>
        {(() => { const who = submitters.get(b.id); return who && (who.submitter_name || who.submitter_email) ? <p className="ui-meta"><strong>Submitted by (private):</strong> {who.submitter_name ?? "Guest"}{who.submitter_email ? <> · <a className="ui-text-link" href={`mailto:${who.submitter_email}`}>{who.submitter_email}</a></> : null}</p> : null; })()}
        <dl className="ui-grid ui-grid--2 ui-meta">{(["area", "address", "landmark", "phone", "whatsapp", "email", "website"] as const).map(k => b[k] ? <div key={k}><dt className="ui-eyebrow">{k}</dt><dd>{b[k]}</dd></div> : null)}</dl>
        {(() => { const hours = parseBusinessHours((b as { hours: unknown }).hours); const rows = hourRows(hours).filter(row => row.range); if (!rows.length) return null;
          const open = businessOpenNow(hours);
          return <p className="ui-meta"><strong>Hours:</strong> {rows.map(row => `${row.label} ${row.range}`).join(" · ")} {open === null ? "" : open ? "· Open now (Epe time)" : "· Closed now (Epe time)"}</p>; })()}
        <form action={reviewBusiness} className="ui-stack-sm ui-divider">
          <input type="hidden" name="business_id" value={b.id} />
          <div className="ui-form-grid">
            <label className="ui-field"><span className="label">Decision</span><select name="status" required defaultValue="reviewing" className="input"><option value="reviewing">Keep in review</option><option value="published">Publish</option><option value="rejected">Reject</option></select></label>
            <label className="ui-field"><span className="label">Reason (at least 5 characters)</span><textarea name="note" required minLength={5} maxLength={1000} className="input" /></label>
            <label className="ui-field"><span className="label">Verification evidence (required to publish, at least 10 characters)</span><textarea name="evidence" maxLength={2000} className="input" /></label>
          </div>
          <div className="ui-actions"><SubmitButton className="btn-primary">Record review decision</SubmitButton></div>
        </form>
      </Panel></li>)}</ul>
    </section>}
  </PageFrame>;
}
