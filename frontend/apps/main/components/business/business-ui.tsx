import Link from "next/link";
import type { ReactNode } from "react";
import { MapPinIcon } from "../icons";
import BusinessLogo from "./business-logo";
import { BadgeCheckIcon, StarIcon } from "./business-icons";
import { businessHref, type BusinessSummary } from "../../lib/business-directory";
import { logoDisplayUrl as businessLogoUrl } from "../../lib/media-r2";
import styles from "./business.module.css";

/** Shown only when `published_businesses.is_verified` is true (a current desk verification exists). */
export function VerificationBadge({ compact = false }: { compact?: boolean }) {
  return <span className={`${styles.badge} ${styles.badgeVerified}`}><BadgeCheckIcon />{compact ? "Verified" : "Verified business"}</span>;
}

/** Shown only for a live `business_featured` window. Featured placement is paid, so it is labelled. */
export function FeaturedBadge() {
  return <span className={`${styles.badge} ${styles.badgeFeatured}`}><StarIcon />Featured</span>;
}

export function CategoryBadge({ children, href }: { children: ReactNode; href?: string }) {
  return href ? <Link className={`${styles.badge} ${styles.badgeCategory}`} href={href}>{children}</Link> : <span className={`${styles.badge} ${styles.badgeCategory}`}>{children}</span>;
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>{item.href && index < items.length - 1 ? <Link href={item.href}>{item.label}</Link> : <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>}</li>)}</ol></nav>;
}

/**
 * One listing. The whole card is one link target (the name), so keyboard and screen-reader users get a
 * single stop per business; the stretched-link pseudo-element makes the rest of the card clickable.
 */
export function BusinessCard({ business, featured = false, headingLevel = 3 }: { business: BusinessSummary; featured?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const place = business.area || business.address;
  return <article className={`${styles.card} ${featured ? styles.cardFeatured : ""}`}>
    <div className={styles.cardTop}>
      <BusinessLogo src={businessLogoUrl(business.logo_key)} name={business.name} />
      <div className={styles.cardBadges}>
        {featured ? <FeaturedBadge /> : null}
        {business.is_verified ? <VerificationBadge compact /> : null}
      </div>
    </div>
    <div className={styles.cardBody}>
      <p className={styles.cardCategory}>{business.category_label}</p>
      <Heading className={styles.cardName}><Link className={styles.stretched} href={businessHref(business.slug)}>{business.name}</Link></Heading>
      {business.description ? <p className={styles.cardDescription}>{business.description}</p> : null}
    </div>
    <div className={styles.cardFoot}>
      {place ? <span className={styles.cardPlace}><MapPinIcon size={15} /><span>{place}</span></span> : <span />}
      <span className={styles.cardCta} aria-hidden="true">View business <span>→</span></span>
    </div>
  </article>;
}

export function BusinessCardSkeleton() {
  return <div className={`${styles.card} ${styles.skeleton}`} aria-hidden="true"><div className={styles.cardTop}><span className={`${styles.logo} ${styles.logo_md} ${styles.skeletonBlock}`} /></div><div className={styles.cardBody}><span className={styles.skeletonLine} style={{ width: "35%" }} /><span className={styles.skeletonLine} style={{ width: "70%", height: 18 }} /><span className={styles.skeletonLine} /><span className={styles.skeletonLine} style={{ width: "85%" }} /></div></div>;
}
