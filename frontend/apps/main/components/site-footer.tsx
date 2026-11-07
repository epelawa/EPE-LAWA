import Link from "next/link";
import { footerNavigation } from "../lib/navigation";

export default function SiteFooter() {
  return (
    <footer className="site-footer bg-muted border-t pt-12 pb-8">
      <div className="ep-container">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8">
          <div className="flex items-center gap-2">
            <img
              src="/brand-logo.png"
              alt=""
              width={32}
              height={32}
              className="rounded-sm"
              decoding="async"
            />
            <div className="flex flex-col">
              <span className="font-bold text-foreground">EPE LAWA</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Epe Division
              </span>
            </div>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center text-sm">
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
        <p className="text-center text-xs text-muted-foreground pt-6">
          © {new Date().getFullYear()} EPE LAWA. Epe Division, Lagos State.
        </p>
      </div>
    </footer>
  );
}
