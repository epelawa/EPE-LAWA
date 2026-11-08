import { createClient } from "../../../lib/supabase";
import { advanceOrder } from "./actions";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await createClient();
  const cap = await db.rpc("has_capability", { p_capability: "order.manage" });
  if (cap.error || cap.data !== true) return <PageFrame className="ui-stack"><PageIntro eyebrow="Marketplace · Staff" title="Order management" description="Manage unpaid customer order requests." /><Notice tone="danger" role="alert">The order.manage capability is required.</Notice></PageFrame>;
  const { data, error } = await db.from("orders").select("id,reference,status,total_kobo,currency,contact_name,contact_phone,delivery_method,delivery_address,delivery_landmark,notes,created_at").order("created_at", { ascending: false }).limit(100);
  const { data: items } = await db.from("order_items").select("order_id,name_snapshot,quantity").limit(300);
  const byOrder = new Map<string, string[]>();
  for (const i of items ?? []) byOrder.set(i.order_id, [...(byOrder.get(i.order_id) ?? []), `${i.name_snapshot} × ${i.quantity}`]);
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Marketplace · Staff" title="Order management" description="Requests are unpaid. Payment is unavailable; never mark an order paid. Delivery details are private to authorized order participants." />
    {error ? <EmptyPanel title="Orders unavailable" description="No private order details are displayed. Try again later." /> : !data?.length ? <EmptyPanel title="No order requests yet" description="Customer order requests will appear here when submitted." /> : <section className="ui-stack-sm"><SectionHeading eyebrow="Customer requests" title="Recent orders" description="Update fulfillment status as each request progresses." />
      <ul className="ui-list ui-stack-sm">{data.map(o => <li key={o.id}><Panel className="ui-stack-sm">
        <div className="ui-row"><h2 className="ui-item-title">{o.reference}</h2><StatusBadge tone={o.status === "delivered" ? "success" : o.status === "cancelled" ? "danger" : "neutral"}>{o.status.replaceAll("_", " ")}</StatusBadge><span className="ui-meta">{new Date(o.created_at).toLocaleString("en-NG")}</span></div>
        <div><p className="ui-prose">{(byOrder.get(o.id) ?? []).join(", ") || "No items listed"}</p><p className="ui-meta">Total · {o.currency} {(o.total_kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</p></div>
        <dl className="ui-meta ui-row"><div><dt className="ui-eyebrow">Contact</dt><dd>{o.contact_name} · {o.contact_phone}</dd></div><div><dt className="ui-eyebrow">Fulfillment</dt><dd>{o.delivery_method}</dd></div></dl>
        {o.delivery_method === "delivery" ? <div className="ui-subtle ui-stack-sm"><SectionHeading title="Private delivery details" /><p>{o.delivery_address}</p>{o.delivery_landmark ? <p className="ui-meta">Landmark · {o.delivery_landmark}</p> : null}</div> : null}
        {o.notes ? <p className="ui-muted">Customer note · {o.notes}</p> : null}
        <form action={advanceOrder} className="ui-row ui-divider">
          <input type="hidden" name="order_id" value={o.id} />
          <label className="ui-field"><span className="label">Next status</span><select name="status" className="input">{(o.status === "pending" ? ["preparing", "cancelled"] : o.status === "preparing" ? ["out_for_delivery", "delivered", "cancelled"] : o.status === "out_for_delivery" ? ["delivered", "cancelled"] : []).map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></label>
          <label className="ui-field"><span className="label">Note</span><input name="note" maxLength={500} className="input" /></label>
          <button disabled={o.status === "delivered" || o.status === "cancelled"} className="btn-primary" type="submit">Save status</button>
        </form>
      </Panel></li>)}</ul>
    </section>}
  </PageFrame>;
}
