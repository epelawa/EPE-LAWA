import Link from "next/link";
import { createClient } from "../lib/supabase";
import styles from "./sponsor-slot.module.css";
import SponsorPopup from "./sponsor-popup";

type Sponsor = {
  name: string;
  slug: string;
  category: string | null;
  area: string | null;
};

export async function readSponsor(): Promise<Sponsor | null> {
  try {
    const db = await createClient();
    const { data: placements, error } = await db
      .from("active_business_sponsorships")
      .select("business_id")
      .limit(1);
    if (error || !placements?.[0]?.business_id) return null;
    const { data: business, error: businessError } = await db
      .from("published_businesses")
      .select("name,slug,category_label,area")
      .eq("id", placements[0].business_id)
      .maybeSingle();
    if (businessError || !business?.name || !business.slug) return null;
    return {
      name: business.name,
      slug: business.slug,
      category: business.category_label ?? null,
      area: business.area ?? null,
    };
  } catch {
    return null;
  }
}

export default async function SponsorSlot({
  compact = false,
}: {
  compact?: boolean;
}) {
  const sponsor = await readSponsor();
  return (
    <aside
      className={`${styles.slot} ${compact ? styles.compact : ""}`}
      aria-label="Sponsored placement"
    >
      {sponsor ? (
        <Link
          className={styles.link}
          href={`/business-directory/${encodeURIComponent(sponsor.slug)}`}
        >
          <span className={styles.label}>Sponsored</span>
          <span className={styles.name}>{sponsor.name}</span>
          <span className={styles.meta}>
            {[sponsor.category, sponsor.area].filter(Boolean).join(" · ") ||
              "Local business"}
          </span>
          <span className={styles.action}>
            Explore this local business <span aria-hidden="true">↗</span>
          </span>
        </Link>
      ) : (
        <Link className={styles.link} href="/advertise">
          <span className={styles.label}>Advertise here</span>
          <span className={styles.name}>
            Put your business in the spotlight.
          </span>
          <span className={styles.meta}>
            Connect with people discovering Epe LAWA.
          </span>
          <span className={styles.action}>
            Explore advertising <span aria-hidden="true">→</span>
          </span>
        </Link>
      )}
    </aside>
  );
}

/** Only real active placements are eligible for the optional pop-up. */
export async function SponsorPopupPlacement() {
  const sponsor = await readSponsor();
  return sponsor ? <SponsorPopup sponsor={sponsor} /> : null;
}
