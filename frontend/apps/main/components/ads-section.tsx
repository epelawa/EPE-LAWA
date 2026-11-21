import { createClient } from "../lib/supabase";
import { logoDisplayUrl } from "../lib/media-r2";
import BusinessAdCarousel, { type AdItem } from "./business-ad-carousel";

export async function readAdItems(limit = 8): Promise<AdItem[]> {
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("business_ad_carousel")
      .select("slug,name,category_label,area,logo_key,description")
      .limit(limit);
    if (error || !data?.length) return [];
    return data
      .filter((row): row is typeof row & { name: string; slug: string } => Boolean(row.name && row.slug))
      .map((row) => ({
        slug: row.slug,
        name: row.name,
        categoryLabel: row.category_label ?? "",
        area: row.area ?? null,
        logoUrl: logoDisplayUrl(row.logo_key),
        description: row.description ?? null,
      }));
  } catch {
    return [];
  }
}

export default async function AdsSection({ heading = "Supporting local business" }: { heading?: string }) {
  const items = await readAdItems();
  if (items.length === 0) return null;
  return (
    <section className="ep-container ui-stack-sm" aria-label="Featured local businesses">
      <h2>{heading}</h2>
      <p className="ui-meta">Businesses featured by the EPE LAWA team. Swipe or use the arrows; selection changes as staff update the line-up.</p>
      <BusinessAdCarousel items={items} />
    </section>
  );
}
