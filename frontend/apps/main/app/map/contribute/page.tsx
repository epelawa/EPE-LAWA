import type { Metadata } from "next";
import MapSearch from "../map-search";
import { createClient } from "../../../lib/supabase";
import { PageFrame, TextLink } from "../../../components/design-system";

export const metadata: Metadata = {
  title: "Improve the map",
  description: "Use manual directions or send places, routes and corrections to the EPE LAWA map assistant. Everything is reviewed by a person before it informs the assistant.",
  alternates: { canonical: "/map/contribute" },
};
type Business = { slug: string; name: string; category_label: string; area: string | null; address: string | null; landmark: string | null };

/**
 * Owner brief (2026-11-28): the find-your-way page is the assistant chat only.
 * Manual directions and knowledge/correction submissions live here; a reviewer
 * verifies each submission before the assistant can use it.
 */
export default async function MapContributePage() {
  let businesses: Business[] = [];
  let businessError = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("published_businesses").select("slug,name,category_label,area,address,landmark").order("name").limit(100);
    if (error) {
      console.error("public map business read failed", { code: error.code });
      businessError = true;
    }
    else businesses = (data ?? []) as Business[];
  } catch {
    businessError = true;
  }
  return <PageFrame className="ui-stack">
    <MapSearch businesses={businesses} businessError={businessError} />
    {businesses.length === 100 ? <p className="ui-muted">Business matches are drawn from the first 100 published listings. Browse the <TextLink href="/business-directory">full business directory</TextLink>.</p> : null}
  </PageFrame>;
}
