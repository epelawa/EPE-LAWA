"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronIcon } from "@epelawa/ui";
import type { NavItem } from "../lib/navigation";

const NAV_ID = "site-nav";

function isCurrentPage(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Desktop only: the header stays reachable, but only while the reader scrolls up.
 * On a 320px phone this never runs, because it would cost a third of the viewport.
 */
function useRevealOnScrollUp(): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    let lastY = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        // 4px of hysteresis stops the header flickering on a trackpad or a shaky thumb.
        if (y <= 64) setHidden(false);
        else if (y > lastY + 4) setHidden(true);
        else if (y < lastY - 4) setHidden(false);
        lastY = y;
      });
    };

    const reveal = () => setHidden(false);

    // Tabbing into a hidden header must bring it back, or the focus ring lands on nothing.
    const attach = () => {
      window.removeEventListener("scroll", onScroll);
      if (wide.matches) {
        lastY = window.scrollY;
        window.addEventListener("scroll", onScroll, { passive: true });
      } else {
        setHidden(false);
      }
    };

    attach();
    wide.addEventListener("change", attach);
    window.addEventListener("focusin", reveal);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("focusin", reveal);
      wide.removeEventListener("change", attach);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return hidden;
}

export default function SiteHeader({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const hidden = useRevealOnScrollUp();

  // A route change closes the disclosure so the next page starts at the top of the page,
  // not halfway down an open menu.
  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setExpanded(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  return (
    <header className="site-header" data-hidden={hidden ? "true" : "false"}>
      <div className="ep-container site-header__inner">
        <Link className="site-brand" href="/">
          EPE LAWA
        </Link>

        <button
          ref={toggleRef}
          type="button"
          className="site-nav-toggle"
          aria-expanded={expanded}
          aria-controls={NAV_ID}
          onClick={() => setExpanded((value) => !value)}
        >
          Menu
          <ChevronIcon size={18} />
        </button>

        <nav id={NAV_ID} className="site-nav" aria-label="Main">
          <ul className="site-nav__list">
            {items.map((item) => (
              <li key={item.href}>
                {item.external ? (
                  <a className="site-nav__link" href={item.href}>
                    {item.label}
                  </a>
                ) : (
                  <Link
                    className="site-nav__link"
                    href={item.href}
                    aria-current={isCurrentPage(pathname, item.href) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
