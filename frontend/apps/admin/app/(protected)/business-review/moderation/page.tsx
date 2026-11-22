import { createStaffClient } from "../../../../lib/supabase";
import { moderateBusinessReview } from "../moderation-actions";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, SubmitButton } from "@epelawa/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await createStaffClient();
  const cap = await db.rpc("has_capability", { p_capability: "business.review" });
  if (cap.error || cap.data !== true) return <PageFrame className="ui-stack"><PageIntro eyebrow="Business directory · Staff" title="Review moderation" description="Moderate member-submitted business reviews." /><Notice tone="danger" role="alert">Business review capability is required.</Notice></PageFrame>;
  const { data, error } = await db.from("business_reviews").select("id,business_id,rating,body,created_at").eq("state", "pending").is("deleted_at", null).order("created_at").limit(100);
  const ids = [...new Set((data ?? []).map(x => x.business_id))];
  const businesses = ids.length ? await db.from("businesses").select("id,name").in("id", ids).limit(100) : { data: [] };
  const names = new Map((businesses.data ?? []).map(x => [x.id, x.name]));
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Business directory · Staff" title="Review moderation" description="Member reviews stay private until a reviewer approves them. Hide decisions require a reason and are audited." />
    {error ? <EmptyPanel title="Moderation queue unavailable" description="No review details are displayed. Try again later." /> : !data?.length ? <EmptyPanel title="No reviews awaiting moderation" description="New pending reviews will appear here for staff review." /> : <section className="ui-stack-sm"><SectionHeading eyebrow="Moderation queue" title="Pending member reviews" description="Choose whether to approve and publish or hide each review." />
      <ul className="ui-list ui-stack-sm">{data.map(r => <li key={r.id}><Panel className="ui-stack-sm">
        <div className="ui-row"><StatusBadge tone="warning">Pending</StatusBadge><span className="ui-meta">Received {new Date(r.created_at).toLocaleString("en-NG")}</span></div>
        <h2 className="ui-item-title">{names.get(r.business_id) ?? "Business"} · {r.rating}/5</h2>
        {r.body ? <p className="ui-prose">{r.body}</p> : null}
        <form action={moderateBusinessReview} className="ui-stack-sm ui-divider">
          <input type="hidden" name="review_id" value={r.id} />
          <div className="ui-form-grid">
            <label className="ui-field"><span className="label">Decision</span><select name="decision" className="input"><option value="approve">Approve and publish</option><option value="hide">Hide</option></select></label>
            <label className="ui-field"><span className="label">Reason (at least 5 characters)</span><textarea name="reason" minLength={5} maxLength={1000} required className="input" /></label>
          </div>
          <div className="ui-actions"><SubmitButton pendingLabel="Recording…" className="btn-primary">Save moderation decision</SubmitButton></div>
        </form>
      </Panel></li>)}</ul>
    </section>}
  </PageFrame>;
}
