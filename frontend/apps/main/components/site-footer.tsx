import Link from "next/link";
import { Container } from "@epelawa/ui";
import { footerNavigation } from "../lib/navigation";
import { newsUrl } from "../lib/site";

export default function SiteFooter() {
  return (
    <footer className="site-footer ep-on-dark">
      <Container>
        <div className="site-footer__topline">
          <span>EPE LAWA</span>
          <span>The official Epe Lawa website</span>
        </div>
        <div className="site-footer__grid">
          <div>
            <p className="site-footer__brand">
              A public record
              <br />
              of Epe.
            </p>
            <p className="site-footer__summary">
              Independent journalism, public knowledge and the people shaping
              Epe Division.
            </p>
          </div>
          <div className="site-footer__column">
            <p className="site-footer__label">Explore</p>
            {newsUrl ? (
              <a className="site-footer__link" href={newsUrl}>
                Latest news ↗
              </a>
            ) : null}
            <Link className="site-footer__link" href="/radio">
              Radio
            </Link>
            <Link className="site-footer__link" href="/gallery">
              Gallery
            </Link>
            <Link className="site-footer__link" href="/guidelines">
              Editorial standards
            </Link>
          </div>
          <div className="site-footer__column">
            <p className="site-footer__label">Work with us</p>
            <Link className="site-footer__link" href="/contact">
              Contact & partnerships
            </Link>
            <Link className="site-footer__link" href="/contact">
              Advertise with us
            </Link>
            <Link className="site-footer__link" href="/contact">
              Submit a story
            </Link>
          </div>
        </div>
        <div className="site-footer__bottom">
          <p className="site-footer__meta">
            © {new Date().getFullYear()} EPE LAWA / Epe Division, Lagos State
          </p>
          <nav aria-label="Legal">
            <ul className="site-footer__list">
              {footerNavigation
                .filter((item) => ["/privacy", "/terms"].includes(item.href))
                .map((item) => (
                  <li key={item.href}>
                    <Link className="site-footer__link" href={item.href}>
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
