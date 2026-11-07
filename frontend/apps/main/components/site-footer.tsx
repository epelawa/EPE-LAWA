import Link from "next/link";
import { footerNavigation } from "../lib/navigation";
import { BrandLockup } from "./brand";

/**
 * Site footer.
 *
 * A hairline and a lot of air. The previous version was a filled grey slab,
 * which made every page end in a box.
 */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="ep-container">
        <div className="site-footer__top">
          <Link className="nav-brand" href="/" aria-label="EPE LAWA — home">
            <BrandLockup size={28} />
          </Link>

          <nav aria-label="Footer">
            <ul>
              {footerNavigation.map((item) => (
                <li key={item.href}>
                  <Link className="nav-link" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="site-footer__note">
          © {new Date().getFullYear()} EPE LAWA. Epe Division, Lagos State.
        </p>
      </div>
    </footer>
  );
}
