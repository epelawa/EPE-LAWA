import Link from "next/link";
import { BrandLockup } from "./brand";
import NewsletterForm from "./newsletter-form";
import styles from "./news-footer.module.css";
import { MOBILE_GROUPS, MOBILE_EXTRA_LINKS } from "../lib/mobile-navigation";
import { readSiteLanguage, t } from "../lib/i18n";
import LanguageSwitch from "./language-switch";

const quickLinks: ReadonlyArray<readonly [string, string]> = [["/", "Home"], ...MOBILE_GROUPS.flatMap(group => [...group.routes] as ReadonlyArray<readonly [string, string]>), ...MOBILE_EXTRA_LINKS];
function QuickLinks() { return <nav aria-label="Quick links"><ul className={styles.quickLinks}>{quickLinks.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul></nav>; }

/** One news section (owner, turn 26): Epe Division only, so the footer links places, not categories. */
const EPE_LINKS: ReadonlyArray<readonly [string, string]> = [["/news", "Epe Division news"], ["/map", "Map of Epe"], ["/business-directory", "Businesses in Epe"], ["/events", "Events"]];

export default async function NewsFooter({ listing = false }: { listing?: boolean }) {
  const lang = await readSiteLanguage();
  if (listing) return <footer className={`${styles.listingFooter} site-footer`} aria-label="EPE LAWA news footer">
    <div className={styles.listingInner}>
      <section className={styles.listingIdentity}>
        <Link className={styles.brandLink} href="/" aria-label="EPE LAWA home"><BrandLockup size={42} /></Link>
        <p>Stories that connect us to Epe and each other.</p>
        <div className={styles.socialLinks} aria-label="EPE LAWA social media">
          <a href="https://www.facebook.com/people/EPE-LAWA/100092630340226/" target="_blank" rel="noopener noreferrer" aria-label="EPE LAWA on Facebook (opens in a new tab)"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.5v3h2.6v8h3.4Z"/></svg> Facebook ↗</a>
          <a href="https://www.youtube.com/@EPE_LAWA" target="_blank" rel="noopener noreferrer" aria-label="EPE LAWA on YouTube (opens in a new tab)"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8ZM10 15.4V8.6l5.8 3.4L10 15.4Z"/></svg> YouTube ↗</a>
        </div>
      </section>
      <section className={`${styles.listingColumn} ${styles.listingQuick}`}><h2>{t(lang, "footer.quickLinks")}</h2><QuickLinks /></section>
      <section className={styles.listingColumn}><h2>{t(lang, "footer.browseTopics")}</h2><nav aria-label="Epe Division">{EPE_LINKS.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav></section>
      <section className={styles.listingNewsletter} aria-labelledby="footer-newsletter-heading"><h2 id="footer-newsletter-heading">{t(lang, "footer.newsletter")}</h2><p>{t(lang, "footer.newsletterNote")}</p><NewsletterForm id="news-listing-signup" variant="footer" /></section>
    </div>
    <div className={styles.listingBottom}><span>© {new Date().getFullYear()} EPE LAWA</span><span>{t(lang, "footer.tagline")}</span><Link href="/photo-credits">{t(lang, "footer.photoCredits")}</Link><Link href="/privacy">{t(lang, "footer.privacy")}</Link><Link href="/terms">{t(lang, "footer.terms")}</Link><LanguageSwitch lang={lang} /></div>
  </footer>;
  return (
    <footer className={styles.footer} aria-label="EPE LAWA site footer">
      <div className={styles.inner}>
        <section className={styles.identity} aria-label="EPE LAWA">
          <Link className={styles.brandLink} href="/" aria-label="EPE LAWA home"><BrandLockup size={42} /></Link>
          <p>Local reporting and community information from Epe, Lagos State.</p>
        </section>
        <section className={styles.column}>
          <h2>{t(lang, "footer.quickLinks")}</h2>
          <QuickLinks />
        </section>
        <section className={styles.column}>
          <h2>Epe Division</h2>
          <nav aria-label="Epe Division"><ul>
            {EPE_LINKS.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}
          </ul></nav>
        </section>
        <section className={`${styles.column} ${styles.newsletter}`}>
          <h2>{t(lang, "footer.newsletter")}</h2>
          <p>{t(lang, "footer.newsletterNote")}</p>
          <NewsletterForm id="news-footer-signup" variant="footer" />
        </section>
      </div>
      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} EPE LAWA. All rights reserved.</span>
        <span>{t(lang, "footer.tagline")}</span>
        <LanguageSwitch lang={lang} />
      </div>
    </footer>
  );
}
