"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { primaryNavigation, type NavItem } from "../lib/navigation";
import { ArrowRightIcon } from "./icons";
import ThemeToggle from "./theme-toggle";
import { BrandLockup } from "./brand";
import "./navigation-refinement.css";

const current = (path: string, href: string) => href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
const UTILITY_HREFS = new Set(["/about", "/contact", "/advertise"]);

export default function SiteHeader({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const isEditorial = pathname === "/news" || pathname.startsWith("/news/") || pathname === "/advertise";
  const moreRef = useRef<HTMLDetailsElement>(null);
  const inline = primaryNavigation(items);
  const more = items.filter((item) => !item.primary && !UTILITY_HREFS.has(item.href));

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && moreRef.current?.open && !moreRef.current.contains(target)) {
        moreRef.current.open = false;
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && moreRef.current?.open) {
        moreRef.current.open = false;
        moreRef.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (moreRef.current?.open) moreRef.current.open = false;
  }, [pathname]);

  return (
    <header className={`site-head${isEditorial ? " site-head--news-reference" : ""}`}>
      <div className="news-utilitybar">
        <div className="news-utilitybar__inner">
          <span className="news-utilitybar__location">Epe, Lagos State · Nigeria</span>
          <nav aria-label="Utility links">
            {items.filter((item) => UTILITY_HREFS.has(item.href)).map((item) => (
              <Link key={item.href} href={item.href} aria-current={current(pathname, item.href) ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="masthead-bar">
        <Link className="nav-brand" href="/" aria-label="EPE LAWA home">
          <BrandLockup size={34} />
        </Link>

        <nav className="site-head__nav" aria-label="Main navigation">
          <ul className="nav-items">
            {inline.map((item) => (
              <li key={item.href}>
                <Link className="nav-link" href={item.href} aria-current={current(pathname, item.href) ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
            {more.length ? (
              <li>
                <details className="nav-more" ref={moreRef}>
                  <summary className="nav-link">
                    More
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <ul className="nav-more__list">
                    <li>
                      <Link className="nav-link" href="/dashboard" aria-current={current(pathname, "/dashboard") ? "page" : undefined}>
                        Member dashboard
                      </Link>
                    </li>
                    {more.map((item) => (
                      <li key={item.href}>
                        <Link className="nav-link" href={item.href} aria-current={current(pathname, item.href) ? "page" : undefined}>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="nav-more__appearance" role="group" aria-label="Appearance settings">
                    <span>Appearance</span>
                    <ThemeToggle />
                  </div>
                </details>
              </li>
            ) : null}
          </ul>
        </nav>

        <div className="masthead-actions">
          <Link className="header-signin" href="/login">Sign in</Link>
          <Link className="btn-primary header-cta" href="/auth">
            Join <ArrowRightIcon size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
