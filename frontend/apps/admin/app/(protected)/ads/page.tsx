import { SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel } from "@epelawa/ui";
import { assignAds, removeAd, updateAdSlot } from "./actions";
import ConfirmSubmit from "../../../components/confirm-submit";
import { logoDisplayUrl } from "../../../../main/lib/media-r2";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SlotRow = { id: string; business_id: string; position: number; is_active: boolean };
type BusinessRow = { id: string; slug: string; name: string; category_label: string; area: string | null; logo_key: string | null };

const STATUS: Record<string, { tone: "success" | "danger"; text: string }> = {
  assigned: { tone: "success", text: "Ad line-up saved. The public carousel is updated." },
  removed: { tone: "success", text: "Business removed from the ads carousel." },
  partial: { tone: "danger", text: "Some selections could not be saved. Check the line-up and retry the missing ones." },
  denied: { tone: "danger", text: "The change was rejected. Confirm your advertising.manage access, reload and try again." },
  invalid: { tone: "danger", text: "That entry was not valid. Select at least one published business." },
  failed: { tone: "danger", text: "The ads workspace is unavailable right now. Reload and try again." },
};

export default async function AdsPage({ searchParams }: { searchParams: Promise<{ ads?: string }> }) {
  const params = await searchParams;
  const db = await createStaffClient();
  const { data: grants, error: grantError } = await db.from("staff_capability_grants").select("capability").eq("capability", "advertising.manage").limit(1);
  if (grantError) return <PageFrame className="ui-stack"><PageIntro eyebrow="Staff workspace" title="Ads" description="Choose which businesses rotate in the public ad carousel." /><Notice tone="danger" role="alert">The ads workspace is unavailable right now. Reload the page to try again.</Notice></PageFrame>;
  if (!grants?.length) return <PageFrame className="ui-stack"><PageIntro eyebrow="Staff workspace" title="Ads" description="Choose which businesses rotate in the public ad carousel." /><Notice tone="danger" role="alert">The advertising.manage capability is required. No records are shown.</Notice></PageFrame>;

  const [{ data: slots, error: slotError }, { data: businesses, error: bizError }] = await Promise.all([
    db.from("business_ad_slots").select("id,business_id,position,is_active").order("position").order("created_at").limit(24),
    db.from("published_businesses").select("id,slug,name,category_label,area,logo_key").order("name").limit(200),
  ]);

  const slotList = (slots ?? []) as SlotRow[];
  const businessList = (businesses ?? []) as BusinessRow[];
  const byId = new Map(businessList.map((b) => [b.id, b]));
  const lineup = slotList.flatMap((slot) => {
    const business = byId.get(slot.business_id);
    return business ? [{ slot, business }] : [];
  });
  const featuredIds = new Set(slotList.map((slot) => slot.business_id));
  const available = businessList.filter((business) => !featuredIds.has(business.id));
  const status = params.ads && STATUS[params.ads] ? STATUS[params.ads] : null;

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Staff workspace · Advertising" title="Ads" description="Control the businesses that appear in the public ads carousel across the website. Select multiple businesses; visitors see them rotate every few seconds, in your chosen order." />
    {status ? <Notice role="status" tone={status.tone}>{status.text}</Notice> : null}

    <section className="ui-stack-sm" aria-labelledby="ads-lineup">
      <h2 id="ads-lineup">Current line-up</h2>
      {slotError ? <Notice role="alert" tone="danger">The current line-up could not be loaded. Reload to try again.</Notice>
        : lineup.length === 0 ? <EmptyPanel title="No businesses in the carousel yet" description="Select published businesses below. Each one gets a card with its logo, category and area, and visitors move through them automatically." />
        : <ul className="ui-list ui-stack-sm">{lineup.map(({ slot, business }) => {
          const logo = logoDisplayUrl(business.logo_key);
          return <li key={slot.id}><Panel className="ui-stack-sm">
            <div className="ui-row" style={{ alignItems: "center", gap: 12 }}>
              {logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo} alt={`${business.name} logo`} width={44} height={44} style={{ borderRadius: 10, objectFit: "cover" }} /> : null}
              <div>
                <h3 className="ui-item-title">{business.name}</h3>
                <p className="ui-meta">{business.category_label}{business.area ? ` · ${business.area}` : ""} · {slot.is_active ? "Showing on the site" : "Paused"}</p>
              </div>
            </div>
            <form action={updateAdSlot} className="ui-row">
              <input type="hidden" name="business_id" value={business.id} />
              <label className="ui-field"><span className="label">Order</span><select className="input" name="position" defaultValue={String(slot.position)} style={{ maxWidth: 160 }}>{Array.from({ length: Math.max(10, slot.position + 1) }, (_, position) => <option key={position} value={position}>{position === 0 ? "0 — shown first" : `Position ${position}`}</option>)}</select></label>
              <label className="ui-row"><input type="checkbox" name="is_active" defaultChecked={slot.is_active} /> Showing</label>
              <SubmitButton className="btn-secondary">Save row</SubmitButton>
            </form>
            <form action={removeAd}>
              <input type="hidden" name="slot_id" value={slot.id} />
              <ConfirmSubmit className="btn-danger" confirmFirst message={`Remove ${business.name} from the public ads carousel?`}>Remove from carousel</ConfirmSubmit>
            </form>
          </Panel></li>;
        })}</ul>}
    </section>

    <section className="ui-stack-sm" aria-labelledby="ads-add">
      <h2 id="ads-add">Add businesses to the carousel</h2>
      <p className="ui-muted">Only published listings are shown here. Tick the ones to feature; they are numbered top to bottom.</p>
      {bizError ? <Notice role="alert" tone="danger">Published businesses could not be loaded. Reload to try again.</Notice>
        : available.length === 0 ? <EmptyPanel title="No published businesses available" description="Once listings are published in the business directory, add them here." />
        : <form action={assignAds} className="ui-stack-sm">
            <ul className="ui-list">{available.map((business) => (
              <li key={business.id}><label className="ui-row"><input type="checkbox" name="featured" value={business.id} /> <span>{business.name}<span className="ui-meta"> · {business.category_label}{business.area ? ` · ${business.area}` : ""}</span></span></label></li>
            ))}</ul>
            <div className="ui-actions"><SubmitButton className="btn-primary">Save selected to the carousel</SubmitButton></div>
            <p className="ui-meta">Up to 12 businesses. They rotate automatically, a few seconds each, with buttons and dots for visitors.</p>
          </form>}
    </section>
  </PageFrame>;
}
