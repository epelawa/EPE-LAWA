import Link from "./admin-link";
import { footerNavigation } from "../lib/navigation";
import { BrandLockup } from "./brand";
export default function SiteFooter() {
  return <footer className="site-footer"><div className="site-footer__inner">
    <Link href="/" className="site-footer__brand"><BrandLockup size={30} /></Link>
    <p className="site-footer__summary">Private workspace for editorial, moderation and verification tasks.</p>
    <nav aria-label="Footer"><ul className="site-footer__list">{footerNavigation.map(item => <li key={item.href}><Link className="site-footer__link" href={item.href}>{item.label}</Link></li>)}</ul></nav>
    <p className="site-footer__meta">© {new Date().getFullYear()} EPE LAWA · Staff workspace</p>
  </div></footer>;
}
