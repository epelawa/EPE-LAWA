import { createClient } from "../../../lib/supabase";
import { reviewBusiness } from "./actions";
import BusinessCreateForm from "../../../components/business-create-form";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string; added?: string }> }) {
  const p = await searchParams;
  const db = await createClient();
  const { data: allowed, error: ge } = await db.rpc("has_capability", { p_capability: "business.review" });
  if (ge || allowed !== true) return <PageFrame className="ui-stack"><PageIntro eyebrow="Marketplace · Staff" title="Business submissions" description="Review and verify new business listings." /><Notice tone="danger" role="alert">Business review capability is required to access this queue.</Notice></PageFrame>;
  const { data, error } = await db.from("businesses").select("id,name,category_id,description,area,address,landmark,phone,whatsapp,email,website,status,created_at").in("status", ["submitted", "reviewing"]).is("deleted_at", null).order("created_at").limit(100);
  const { data: cats } = await db.from("business_categories").select("id,label").limit(100);
  const labels = new Map((cats ?? []).map(c => [c.id, c.label]));
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Marketplace · Staff" title="Business submissions" description="Review unpublished submissions, record evidence, then publish or reject with a reason." />
    {p.error ? <Notice tone="danger" role="alert">Review action failed. Confirm evidence and capability, then retry.</Notice> : null}
    {p.updated ? <Notice tone="success" role="status">Review action recorded.</Notice> : null}
    {p.added ? <Notice tone="success" role="status">Listing published — it is now visible in the public business directory.</Notice> : null}
    {cats?.length ? <Panel><SectionHeading eyebrow="Direct listing" title="Add a business" description="Publish a listing yourself, right now — no submission needed. Everything you save here appears in the public directory immediately." /><BusinessCreateForm categories={cats} /></Panel> : null}
    {error ? <EmptyPanel title="Queue unavailable" description="No listing details are shown. Try again later." /> : !data?.length ? <EmptyPanel title="No submissions awaiting review" description="New business submissions will appear here for staff review." /> : <section className="ui-stack-sm"><SectionHeading eyebrow="Review queue" title="Pending submissions" description="Review each listing and record a clear, auditable decision." />
      <ul className="ui-list ui-stack-sm">{data.map(b => <li key={b.id}><Panel className="ui-stack-sm">
        <div className="ui-row"><StatusBadge tone={b.status === "submitted" ? "warning" : "neutral"}>{b.status}</StatusBadge><span className="ui-meta">{labels.get(b.category_id) ?? "Category"} · Received {new Date(b.created_at).toLocaleString("en-NG")}</span></div>
        <div><h2 className="ui-item-title">{b.name}</h2><p className="ui-prose">{b.description || "No description provided."}</p></div>
        <dl className="ui-grid ui-grid--2 ui-meta">{(["area", "address", "landmark", "phone", "whatsapp", "email", "website"] as const).map(k => b[k] ? <div key={k}><dt className="ui-eyebrow">{k}</dt><dd>{b[k]}</dd></div> : null)}</dl>
        <form action={reviewBusiness} className="ui-stack-sm ui-divider">
          <input type="hidden" name="business_id" value={b.id} />
          <div className="ui-form-grid">
            <label className="ui-field"><span className="label">Decision</span><select name="status" required defaultValue="reviewing" className="input"><option value="reviewing">Keep in review</option><option value="published">Publish</option><option value="rejected">Reject</option></select></label>
            <label className="ui-field"><span className="label">Reason (at least 5 characters)</span><textarea name="note" required minLength={5} maxLength={1000} className="input" /></label>
            <label className="ui-field"><span className="label">Verification evidence (required to publish, at least 10 characters)</span><textarea name="evidence" maxLength={2000} className="input" /></label>
          </div>
          <div className="ui-actions"><button className="btn-primary" type="submit">Record review decision</button></div>
        </form>
      </Panel></li>)}</ul>
    </section>}
  </PageFrame>;
}
