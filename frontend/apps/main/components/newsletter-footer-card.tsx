import Link from "next/link";
import styles from "./newsletter-footer-card.module.css";

export default function NewsletterFooterCard() {
  return (
    <section className={styles.card} aria-labelledby="newsletter-footer-heading">
      <p className={styles.eyebrow}>Stay informed</p>
      <div className={styles.headingRow}>
        <h2 id="newsletter-footer-heading">EPE LAWA Newsletter</h2>
        <span className={styles.status}>Unavailable</span>
      </div>
      <p className={styles.copy}>
        Subscription storage, email delivery, unsubscribe handling and abuse controls are not ready. No email address is collected here.
      </p>
      <nav className={styles.links} aria-label="Newsletter availability">
        <Link href="/newsletter">Sign-up unavailable</Link>
        <Link href="/newsletter/unsubscribe">Unsubscribe unavailable</Link>
      </nav>
    </section>
  );
}
