import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { publicMediaUrl } from "../../../lib/media";
import { logoDisplayUrl as businessLogoUrl } from "../../../lib/media-r2";
import { pageMetadata } from "../../../lib/metadata";
import { CONTACT_EMAIL } from "../../../lib/site-identity";
import { parseBusinessHours, hourRows, businessOpenNow } from "../../../lib/business-hours";
import { SUMMARY_COLUMNS, directionsHref, directoryHref, safeWebsite, telHref, websiteLabel, whatsappHref, type BusinessSummary } from "../../../lib/business-directory";
import { EmptyPanel, PageFrame, StatusBadge } from "../../../components/design-system";
import { MapPinIcon } from "../../../components/icons";
import BusinessLogo from "../../../components/business/business-logo";
import { BusinessCard, Breadcrumbs, CategoryBadge, FeaturedBadge, VerificationBadge } from "../../../components/business/business-ui";
import { FlagIcon, GlobeIcon, LandmarkIcon, MailIcon, PhoneIcon } from "../../../components/business/business-icons";
import ClaimBusinessModal from "./claim-modal";
import BusinessContactLinks from "./contact-links";
import styles from "./profile.module.css";

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };
type Business = { id: string; slug: string; name: string; category_slug: string; category_label: string; description: string | null; area: string | null; address: string | null; landmark: string | null; phone: string | null; whatsapp: string | null; email: string | null; website: string | null; hours: Record<string, unknown> | null; is_verified: boolean; logo_key: string | null };
type PhotoRow = { media_assets: { object_key: string; provider: string } | null; alt_text: string | null };

const PROFILE_COLUMNS = "id,slug,name,category_slug,category_label,description,area,address,landmark,phone,whatsapp,email,website,hours,is_verified,logo_key";
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const db = await createClient();
    const { data } = await db.from("published_businesses").select("name,category_label,description,area,logo_key").eq("slug", slug).maybeSingle();
    if (data?.name) {
      const summary = (data.description ?? "").replace(/\s+/g, " ").trim();
      const description = summary ? (summary.length > 158 ? `${summary.slice(0, 155).trimEnd()}…` : summary) : `${data.name}: ${data.category_label}${data.area ? ` in ${data.area}` : ""}. Contact details and information on EPE LAWA.`;
      const base = pageMetadata({ title: data.name, description, path: `/business-directory/${encodeURIComponent(slug)}` });
      const logo = businessLogoUrl(data.logo_key);
      return logo ? { ...base, openGraph: { ...base.openGraph, images: [{ url: logo, alt: `${data.name} logo` }] } } : base;
    }
  } catch { /* fall through to the generic title */ }
  return { title: "Business profile", robots: { index: false } };
}

export default async function BusinessProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const claimSent = (await searchParams)?.claim === "sent";
  let business: Business | null = null, failed = false, photos: PhotoRow[] = [], claimed = false, signedIn = false, featured = false, related: BusinessSummary[] = [];
  try {
    const db = await createClient();
    const [result, sessionResult] = await Promise.all([
      db.from("published_businesses").select(PROFILE_COLUMNS).eq("slug", slug).maybeSingle(),
      db.auth.getUser(),
    ]);
    signedIn = Boolean(sessionResult.data?.user);
    if (result.error) failed = true;
    else {
      business = result.data as Business | null;
      if (business) {
        const [photoResult, claimResult, featuredResult, relatedResult] = await Promise.all([
          db.from("business_photos").select("alt_text,media_assets(object_key,provider)").eq("business_id", business.id).order("sort_order", { ascending: true }).limit(12),
          db.from("businesses").select("owner_user_id").eq("id", business.id).maybeSingle(),
          db.from("business_featured").select("ends_at").eq("business_id", business.id).gt("ends_at", new Date().toISOString()).limit(1),
          db.from("published_businesses").select(SUMMARY_COLUMNS).eq("category_slug", business.category_slug).neq("id", business.id).order("is_verified", { ascending: false }).order("name").limit(3),
        ]);
        photos = ((photoResult.data ?? []) as unknown) as PhotoRow[];
        claimed = Boolean((claimResult.data as { owner_user_id: string | null } | null)?.owner_user_id);
        featured = (featuredResult.data ?? []).length > 0;
        related = relatedResult.error ? [] : ((relatedResult.data ?? []) as unknown as BusinessSummary[]);
      }
    }
  } catch { failed = true; }
  if (!business && !failed) notFound();
  if (!business) return <PageFrame><EmptyPanel as="h1" title="Business profile unavailable" description="Please try again later." actions={<Link className="btn-secondary" href={`/business-directory/${encodeURIComponent(slug)}`}>Try again</Link>} /></PageFrame>;

  const b = business;
  const logo = businessLogoUrl(b.logo_key);
  const hours = parseBusinessHours(b.hours);
  const openNow = businessOpenNow(hours);
  const wa = whatsappHref(b.whatsapp);
  const tel = telHref(b.phone);
  const website = safeWebsite(b.website);
  const directions = directionsHref(b.address, b.area);
  const email = b.email && EMAIL.test(b.email.trim()) ? b.email.trim() : null;
  const hasActions = Boolean(wa || tel || website || directions);
  const gallery = photos.map((photo) => ({ url: photo.media_assets ? publicMediaUrl(photo.media_assets.object_key) : null, alt: photo.alt_text ?? b.name })).filter((photo) => photo.url);
  const info: Array<{ label: string; icon: React.ReactNode; value: React.ReactNode }> = [];
  if (b.address) info.push({ label: "Address", icon: <MapPinIcon size={18} />, value: b.address });
  if (b.area) info.push({ label: "Area", icon: <MapPinIcon size={18} />, value: b.area });
  if (b.landmark) info.push({ label: "Landmark", icon: <LandmarkIcon />, value: b.landmark });
  if (tel && b.phone) info.push({ label: "Phone", icon: <PhoneIcon />, value: <a href={tel}>{b.phone}</a> });
  if (wa && b.whatsapp && b.whatsapp !== b.phone) info.push({ label: "WhatsApp", icon: <PhoneIcon />, value: <a href={wa} target="_blank" rel="noopener noreferrer">{b.whatsapp}</a> });
  if (email) info.push({ label: "Email", icon: <MailIcon />, value: <a href={`mailto:${email}`}>{email}</a> });
  if (website) info.push({ label: "Website", icon: <GlobeIcon />, value: <a href={website} target="_blank" rel="noopener noreferrer">{websiteLabel(website)}<span className="sr-only"> (opens in a new tab)</span></a> });

  // LocalBusiness structured data from stored fields only: no ratings, no invented hours or geo.
  const jsonLd: Record<string, unknown> = { "@context": "https://schema.org", "@type": "LocalBusiness", name: b.name };
  if (b.description) jsonLd.description = b.description;
  if (logo) jsonLd.logo = logo;
  if (b.phone && tel) jsonLd.telephone = b.phone;
  if (email) jsonLd.email = email;
  if (website) jsonLd.url = website;
  if (b.address) jsonLd.address = { "@type": "PostalAddress", streetAddress: b.address, ...(b.area && !/^online$/i.test(b.area) ? { addressLocality: b.area } : {}) };

  // With no description, hours, photos or claim notice the main column would be an empty gap on desktop;
  // the side cards then flow as one responsive grid instead.
  const hasMain = Boolean(claimSent || b.description || Object.keys(hours).length || gallery.length);
  const reportSubject = encodeURIComponent(`Incorrect business listing: ${b.name}`);
  return <div className={`${styles.page} page-full-bleed`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <header className={styles.identityBand}>
      <div className={styles.container}>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Businesses", href: "/business-directory" }, { label: b.category_label, href: directoryHref({ category: b.category_slug }) }, { label: b.name }]} />
        <div className={styles.identity}>
          <BusinessLogo src={logo} name={b.name} size="lg" alt={logo ? `${b.name} logo` : ""} />
          <div className={styles.identityText}>
            <div className={styles.badges}>
              <CategoryBadge href={directoryHref({ category: b.category_slug })}>{b.category_label}</CategoryBadge>
              {b.is_verified ? <VerificationBadge /> : null}
              {featured ? <FeaturedBadge /> : null}
            </div>
            <h1 className={styles.name}>{b.name}</h1>
            {b.area || b.address ? <p className={styles.place}><MapPinIcon size={16} />{b.area || b.address}</p> : null}
          </div>
        </div>
        {hasActions ? <BusinessContactLinks slug={b.slug} name={b.name} phone={b.phone} phoneHref={tel} whatsappHref={wa} website={website} directionsHref={directions} /> : <p className={styles.noContact}>This listing has no public contact details yet.</p>}
      </div>
    </header>

    <div className={`${styles.container} ${styles.layout} ${hasMain ? "" : styles.layoutSingle}`}>
      <div className={styles.main} hidden={!hasMain}>
        {claimSent ? <p className={styles.notice} role="status">Your claim was sent to the team. They will verify your connection and confirm by email.</p> : null}
        {b.description ? <section className={styles.card} aria-labelledby="business-about">
          <h2 id="business-about">About {b.name}</h2>
          <p className={styles.description}>{b.description}</p>
        </section> : null}

        {Object.keys(hours).length ? <section className={styles.card} aria-labelledby="business-hours">
          <div className={styles.cardHead}>
            <h2 id="business-hours">Opening hours</h2>
            <span className={styles.cardHeadMeta}>{openNow === null ? null : openNow ? <StatusBadge tone="success">Open now</StatusBadge> : <StatusBadge tone="warning">Closed now</StatusBadge>}<span>Epe time</span></span>
          </div>
          <dl className={styles.hours}>{hourRows(hours).map((row) => <div key={row.day}><dt>{row.label}</dt><dd>{row.range ?? "Closed"}</dd></div>)}</dl>
        </section> : null}

        {gallery.length ? <section className={styles.card} aria-labelledby="business-gallery-heading">
          <h2 id="business-gallery-heading">Photo gallery</h2>
          <ul className={styles.galleryGrid}>{gallery.map((photo, index) => <li key={`${photo.url}-${index}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}<img className={styles.galleryPhoto} src={photo.url as string} alt={photo.alt} loading="lazy" decoding="async" width={480} height={360} />
          </li>)}</ul>
        </section> : null}
      </div>

      <aside className={styles.aside} aria-label="Business details">
        {info.length ? <section className={styles.card} aria-labelledby="business-info">
          <h2 id="business-info">Contact and location</h2>
          <dl className={styles.info}>{info.map((row) => <div key={row.label}><span className={styles.infoIcon} aria-hidden="true">{row.icon}</span><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
        </section> : null}

        <section className={styles.card} aria-labelledby="business-ownership">
          <h2 id="business-ownership">Business ownership</h2>
          {claimed && b.is_verified ? <p className={styles.muted}>This listing is managed by its owner and verified by the EPE LAWA desk.</p> : <>
            <p className={styles.muted}>Owners can claim a listing to keep it accurate. The desk verifies every claim before linking an account; nothing changes until then.</p>
            <div className={styles.claimBlock}><ClaimBusinessModal businessId={b.id} slug={b.slug} signedIn={signedIn} /></div>
          </>}
        </section>

        <section className={`${styles.card} ${styles.report}`} aria-labelledby="business-report">
          <h2 id="business-report"><FlagIcon /> Something incorrect?</h2>
          <p className={styles.muted}>Tell the desk what is wrong with this listing and it will be checked.</p>
          <div className={styles.reportActions}>
            <Link className="btn-secondary" href="/support">Report through support</Link>
            <a className="ui-text-link" href={`mailto:${CONTACT_EMAIL}?subject=${reportSubject}`}>Email {CONTACT_EMAIL}</a>
          </div>
        </section>
      </aside>
    </div>

    {related.length ? <section className={`${styles.container} ${styles.related}`} aria-labelledby="business-related">
      <div className={styles.relatedHead}>
        <h2 id="business-related">More in {b.category_label}</h2>
        <Link href={directoryHref({ category: b.category_slug })}>See all <span aria-hidden="true">→</span></Link>
      </div>
      <ul className={styles.relatedGrid}>{related.map((r) => <li key={r.id}><BusinessCard business={r} /></li>)}</ul>
    </section> : null}

    <p className={`${styles.container} ${styles.back}`}><Link href="/business-directory">← Back to businesses</Link></p>
  </div>;
}
