import Link from "next/link";
import { Container } from "@epelawa/ui";
import { footerNavigation } from "../lib/navigation";

export default function SiteFooter() {
  return (
    <footer className="site-footer ep-on-dark">
      <Container>
        <p className="site-footer__brand">EPE LAWA</p>
        <p className="site-footer__summary">
          News, conversation, radio and local businesses for Epe Division, Lagos State, at home
          and abroad.
        </p>

        <nav aria-label="Footer">
          <ul className="site-footer__list">
            {footerNavigation.map((item) => (
              <li key={item.href}>
                <Link className="site-footer__link" href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="site-footer__meta">© {new Date().getFullYear()} EPE LAWA</p>
      </Container>
    </footer>
  );
}
