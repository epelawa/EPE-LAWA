import Link from "next/link";
import { createClient } from "../lib/supabase";
import { BrandLockup } from "./brand";
import NewsletterUnavailable from "./newsletter-unavailable";
import styles from "./news-footer.module.css";

type NewsCategory = { slug: string; label: string };

async function readActiveCategories(): Promise<NewsCategory[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("slug,label")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true })
      .limit(8);
    if (error) return [];
    return (data ?? []) as NewsCategory[];
  } catch {
    return [];
  }
}

export default async function NewsFooter({ categories }: { categories?: NewsCategory[] }) {
  const links = categories ?? await readActiveCategories();
  return (
    <footer className={styles.footer} aria-label="EPE LAWA site footer">
      <div className={styles.inner}>
        <section className={styles.identity} aria-label="EPE LAWA">
          <Link className={styles.brandLink} href="/" aria-label="EPE LAWA home"><BrandLockup size={42} /></Link>
          <p>Local reporting and community information from Epe, Lagos State.</p>
        </section>
        <section className={styles.column}>
          <h2>Quick Links</h2>
          <nav aria-label="Quick links"><ul>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/contact">Contact availability</Link></li>
            <li><Link href="/advertise">Advertise</Link></li>
          </ul></nav>
        </section>
        <section className={styles.column}>
          <h2>Categories</h2>
          <nav aria-label="News categories"><ul>
            {links.length ? links.map((category) => <li key={category.slug}><Link href={`/news?category=${encodeURIComponent(category.slug)}`}>{category.label}</Link></li>) : <li><Link href="/news">All News</Link></li>}
          </ul></nav>
        </section>
        <section className={`${styles.column} ${styles.newsletter}`}>
          <h2>Newsletter</h2>
          <p>Newsletter email delivery is not configured.</p>
          <NewsletterUnavailable id="news-footer-signup" variant="footer" />
        </section>
      </div>
      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} EPE LAWA. All rights reserved.</span>
        <span>Rooted in Epe, Lagos State.</span>
      </div>
    </footer>
  );
}
