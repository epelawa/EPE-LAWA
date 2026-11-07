import type { Metadata } from "next";
import MapSearch from "./map-search";
import { createClient } from "../../lib/supabase";

export const metadata: Metadata = {
  title: "Map & Navigation",
  description: "Search streets, landmarks and published Epe businesses, then open directions.",
  alternates: { canonical: "/map" },
};
type Business = { slug: string; name: string; category_label: string; area: string | null; address: string | null; landmark: string | null };

export default async function MapPage() {
  let businesses: Business[] = [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("published_businesses").select("slug,name,category_label,area,address,landmark").order("name").limit(100);
    if (error) console.error("public map business read failed", { code: error.code });
    else businesses = (data ?? []) as Business[];
  } catch {
    // Map search remains usable through its clearly disclosed outbound fallback.
  }
  return <div className="ep-container py-12">
    <header className="mb-8"><p className="page-header__eyebrow">Map & Navigation</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find your way around Epe.</h1><p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">Find a published business from the EPE LAWA directory or search a street, landmark or address on Google Maps. Choose whether to share your device location; it is never requested automatically.</p></header>
    <MapSearch businesses={businesses}/>
    {businesses.length === 100 ? <p className="mt-4 text-sm text-muted-foreground">Business matches are drawn from the first 100 published listings. Browse the <a className="underline" href="/business-directory">full business directory</a>.</p> : null}
  </div>;
}
