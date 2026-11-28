import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "../../../lib/site";
import UnsubscribeForm from "./unsubscribe-form";
import styles from "./unsubscribe.module.css";

export const metadata: Metadata = {
  title: "Unsubscribe from the newsletter",
  description: "Manage your EPE LAWA newsletter subscription.",
  alternates: { canonical: absoluteUrl("/newsletter/unsubscribe") },
  robots: { index: false, follow: false },
};

export default async function NewsletterUnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const params = await searchParams;
  const token = typeof params.token === "string" && /^[a-f0-9]{64}$/.test(params.token) ? params.token : "";
  return <main className={styles.page}><div className={styles.card}>
    <p className={styles.eyebrow}>EPE LAWA NEWSLETTER</p>
    <h1>Manage your subscription</h1>
    <p className={styles.copy}>Use this page to stop newsletter emails. Your request is handled by EPE LAWA’s own subscriber system, not a verification email link.</p>
    {token ? <UnsubscribeForm token={token} /> : <p className={styles.error}>This unsubscribe link is invalid or incomplete. Open the latest newsletter email and try again.</p>}
    <Link className={styles.back} href="/news">Back to News</Link>
  </div></main>;
}
