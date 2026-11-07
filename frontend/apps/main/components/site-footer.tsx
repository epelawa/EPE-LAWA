import Link from "next/link";
import { footerNavigation } from "../lib/navigation";
import { ArrowRightIcon } from "./icons";
import { BrandLockup } from "./brand";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="ep-container">
        <div className="site-footer__main">
          <div className="site-footer__identity">
            <Link className="nav-brand" href="/">
              <BrandLockup size={36} />
            </Link>
            <p>Stories, voices and useful connections from Epe Division.</p>
            <span>Epe Division · Lagos State, Nigeria</span>
          </div>

          <div className="site-footer__links">
            <div>
              <h2>Explore</h2>
              <nav aria-label="Footer navigation">
                <ul>
                  {footerNavigation.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href}>{item.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div>
              <h2>About EPE LAWA</h2>
              <nav aria-label="Information and policies">
                <ul>
                  <li><Link href="/about">About</Link></li>
                  <li><Link href="/contact">Contact</Link></li>
                  <li><Link href="/guidelines">Community guidelines</Link></li>
                  <li><Link href="/privacy">Privacy notice</Link></li>
                  <li><Link href="/terms">Terms of use</Link></li>
                </ul>
              </nav>
            </div>

            <div className="site-footer__note-block">
              <h2>Stay connected to Epe.</h2>
              <p>
                Find local reporting, community conversation and useful information across EPE LAWA.
              </p>
              <Link className="footer-cta" href="/news">
                Start with the news <ArrowRightIcon size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} EPE LAWA</span>
          <span>For the people and communities of Epe Division.</span>
        </div>
      </div>
    </footer>
  );
}
