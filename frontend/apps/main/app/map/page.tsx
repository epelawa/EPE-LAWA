import type { Metadata } from "next";
import MapSearch from "./map-search";
import MapAssistant from "./map-assistant";
import { createClient } from "../../lib/supabase";
import { PageFrame, TextLink } from "../../components/design-system";

export const metadata: Metadata = {
  title: "Map & Navigation",
  description: "Ask the EPE LAWA directions assistant about streets, landmarks and routes in Epe Division, then use manual search or directions if you prefer.",
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
    <MapAssistant />
    <MapSearch businesses={businesses} businessError={businessError} />
    {businesses.length === 100 ? <p className="ui-muted">Business matches are drawn from the first 100 published listings. Browse the <TextLink href="/business-directory">full business directory</TextLink>.</p> : null}
  </PageFrame>;
}
