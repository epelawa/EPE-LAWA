import Link from "next/link";
import { createClient } from "../lib/supabase";
import styles from "./sponsor-slot.module.css";
import SponsorPopup from "./sponsor-popup";

function ArrowIcon({ direction }: { direction: "up-right" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {direction === "up-right" ? <path d="M7 17 17 7M8 7h9v9" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );
}

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
  footer = false,
}: {
  compact?: boolean;
  footer?: boolean;
}) {
  const sponsor = await readSponsor();
  return (
    <aside
      className={`${styles.slot} ${compact ? styles.compact : ""} ${footer ? styles.footerSlot : ""}`}
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
            Patronise this local business <ArrowIcon direction="up-right" />
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
            Advertise with EPE LAWA <ArrowIcon direction="right" />
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
