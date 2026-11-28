import Link from "next/link";
import NewsletterForm from "./newsletter-form";
import styles from "./newsletter-footer-card.module.css";

export default function NewsletterFooterCard() {
  return (
    <section
      className={styles.card}
      aria-labelledby="newsletter-footer-heading"
    >
      <div className={styles.headingRow}>
        <h2 id="newsletter-footer-heading">EPE LAWA Newsletter</h2>
        <span className={styles.status}>Open</span>
      </div>
      <p className={styles.copy}>
        Reporting and community updates from Epe, delivered with a simple
        unsubscribe link.
      </p>
      <NewsletterForm id="newsletter-card-signup" variant="footer" />
      <nav className={styles.links} aria-label="Newsletter management">
        <Link href="/newsletter">Subscribe</Link>
        <Link href="/newsletter/unsubscribe">Manage subscription</Link>
      </nav>
    </section>
  );
}
