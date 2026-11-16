"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { footerNavigation } from "../lib/navigation";
import { BrandLockup } from "./brand";
import NewsletterFooterCard from "./newsletter-footer-card";

export default function SiteFooter() {
  const pathname = usePathname() ?? "/";
  const isEditorial = pathname === "/news" || pathname.startsWith("/news/") || pathname === "/advertise";
  if (isEditorial) return null;

  return (
    <footer className="site-footer">
      <div className="ep-container">
        <div className="footer-top">
          <div className="footer-identity">
            <Link className="nav-brand" href="/"><BrandLockup size={32} /></Link>
            <p>A shared home for the place, the people, and everything that connects us.</p>
            <span>Epe · Lagos State, Nigeria</span>
          </div>
          <div className="footer-columns">
            <div>
              <h2>Find your way</h2>
              <nav aria-label="Footer navigation">
                <ul>{footerNavigation.map((item) => <li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}</ul>
              </nav>
            </div>
            <div>
              <h2>The essentials</h2>
              <nav aria-label="Information and policies">
                <ul>
                  <li><Link href="/about">About EPE LAWA</Link></li>
                  <li><Link href="/contact">Contact availability</Link></li>
                  <li><Link href="/guidelines">Community guidelines</Link></li>
                  <li><Link href="/privacy">Privacy notice</Link></li>
                  <li><Link href="/terms">Terms of use</Link></li>
                  <li><Link href="/photo-credits">Photo credits</Link></li>
                  <li><Link href="/login">Member sign in</Link></li>
                  <li><Link href="/auth">Create an account</Link></li>
                </ul>
              </nav>
            </div>
          </div>
          <NewsletterFooterCard />
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} EPE LAWA</span>
          <span>Rooted in Epe. Open to everyone.</span>
          <Link href="/contact">Messages are not accepted yet</Link>
        </div>
      </div>
    </footer>
  );
}
