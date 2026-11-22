import Link from "next/link";
import { createClient } from "../lib/supabase";
import { logoDisplayUrl } from "../lib/media-r2";
import styles from "./sponsor-slot.module.css";
import SponsorCarousel, { type SponsorCard } from "./sponsor-carousel";
import SponsorPopup from "./sponsor-popup";

function ArrowIcon({ direction }: { direction: "up-right" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {direction === "up-right" ? <path d="M7 17 17 7M8 7h9v9" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );
}

export type Sponsor = SponsorCard;

/** Staff-selected businesses on the admin Ads desk drive every banner slot. */
export async function readSponsors(limit = 12): Promise<Sponsor[]> {
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("business_ad_carousel")
      .select("business_id,slug,name,category_label,area,logo_key,description")
      .order("position", { ascending: true })
      .limit(limit);
    if (error || !data?.length) return [];
    return data
      .filter((row): row is typeof row & { name: string; slug: string } => Boolean(row.name && row.slug))
      .map((row) => ({
        name: row.name,
        slug: row.slug,
        category: row.category_label ?? null,
        area: row.area ?? null,
        logoUrl: logoDisplayUrl(row.logo_key),
        description: row.description ?? null,
      }));
  } catch {
    return [];
  }
}

export async function readSponsor(): Promise<Sponsor | null> {
  const [sponsor] = await readSponsors();
  return sponsor ?? null;
}

function SponsorLink({ sponsor }: { sponsor: Sponsor }) {
  return (
    <Link
      className={styles.link}
      href={`/business-directory/${encodeURIComponent(sponsor.slug)}`}
    >
      {sponsor.logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className={styles.logo} src={sponsor.logoUrl} alt="" width={56} height={56} loading="lazy" decoding="async" />
      ) : (
        <span className={styles.logoFallback} aria-hidden="true">{sponsor.name.slice(0, 1)}</span>
      )}
      <span className={styles.copy}>
        <span className={styles.label}>Sponsored</span>
        <span className={styles.name}>{sponsor.name}</span>
        <span className={styles.meta}>
          {[sponsor.category, sponsor.area].filter(Boolean).join(" · ") ||
            "Local business"}
        </span>
        <span className={styles.action}>
          Patronise this local business <ArrowIcon direction="up-right" />
        </span>
      </span>
    </Link>
  );
}

export default async function SponsorSlot({
  compact = false,
  footer = false,
}: {
  compact?: boolean;
  footer?: boolean;
}) {
  const sponsors = await readSponsors();
  return (
    <aside
      className={`${styles.slot} ${compact ? styles.compact : ""} ${footer ? styles.footerSlot : ""}`}
      aria-label="Sponsored placement"
    >
      {sponsors.length > 1 ? (
        <SponsorCarousel sponsors={sponsors} compact={compact} />
      ) : sponsors.length === 1 ? (
        <SponsorLink sponsor={sponsors[0]} />
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

/** Only real placements are eligible for the optional pop-up. */
export async function SponsorPopupPlacement() {
  const sponsors = await readSponsors();
  return sponsors.length > 0 ? <SponsorPopup sponsor={sponsors[0]} /> : null;
}
