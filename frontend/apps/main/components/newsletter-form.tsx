import NewsletterActiveForm from "./newsletter-active-form";
import styles from "./newsletter-unavailable.module.css";
type Props = { id: string; variant?: "card" | "footer" };
export default function NewsletterForm({ id, variant = "card" }: Props) {
  if (process.env.NEWSLETTER_SIGNUP_ENABLED === "true") return <NewsletterActiveForm id={id} variant={variant} />;
  const noteId = `${id}-status`;
  return <div className={`${styles.signup} ${variant === "footer" ? styles.footer : ""}`}>
    <label className={styles.label} htmlFor={`${id}-email`}>Email address</label>
    <div className={styles.row}>
      <input id={`${id}-email`} className={styles.email} type="email" placeholder="Sign-up temporarily unavailable" disabled aria-describedby={noteId} />
      <button className={styles.button} type="button" disabled>Subscribe</button>
    </div>
    <p id={noteId} className={styles.note} role="status">Sign-up is temporarily unavailable. Existing unsubscribe links still work.</p>
  </div>;
}
