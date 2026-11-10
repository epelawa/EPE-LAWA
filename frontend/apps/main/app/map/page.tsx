import type { Metadata } from "next";
import MapSearch from "./map-search";
import { createClient } from "../../lib/supabase";
import { PageFrame, PageIntro, TextLink } from "../../components/design-system";

export const metadata: Metadata = {
  title: "Map & Navigation",
  description: "Search streets, landmarks and published Epe businesses, then open directions.",
  alternates: { canonical: "/map" },
};
type Business = { slug: string; name: string; category_label: string; area: string | null; address: string | null; landmark: string | null };

export default async function MapPage() {
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
    <PageIntro eyebrow="Map & navigation" title="Find your way around Epe." description="Find a published business from the EPE LAWA directory or search a street, landmark or address on Google Maps. Choose whether to share your device location; it is never requested automatically." />
    <MapSearch businesses={businesses} businessError={businessError} />
    {businesses.length === 100 ? <p className="ui-muted">Business matches are drawn from the first 100 published listings. Browse the <TextLink href="/business-directory">full business directory</TextLink>.</p> : null}
  </PageFrame>;
}
