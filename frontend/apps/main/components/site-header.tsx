"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "@epelawa/ui";
import ThemeToggle from "./theme-toggle";
import { BrandLockup } from "./brand";
import { primaryNavigation, upcomingSections, type NavItem } from "../lib/navigation";

const DRAWER_ID = "site-drawer";
const SEARCH_ID = "site-search";
const DRAWER_TITLE_ID = "site-drawer-title";

function isCurrentPage(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True once the page has scrolled far enough for the bar to need a background. */
function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}

/**
 * Fixed navigation.
 *
 * The bar is `position: sticky` with `top: 0`, which keeps it on screen for the whole page
 * without stealing layout height the way `position: fixed` does — no body padding to keep in
 * sync, and no anchor jumping under the bar.
 *
 * The drawer is a modal dialog: focus moves in, Tab cycles inside it, Escape closes and
 * returns focus to the button that opened it, and the page behind does not scroll.
 */
export default function SiteHeader({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const scrolled = useScrolled();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const inline = primaryNavigation(items);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // A route change closes everything, so the next page starts at the top, not mid-menu.
  useEffect(() => {
    setDrawerOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Escape closes whichever surface is open and puts focus back on its trigger.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (drawerOpen) {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      } else if (searchOpen) {
        setSearchOpen(false);
        searchButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, searchOpen]);

  // Drawer: lock the page behind it, move focus in, and keep Tab inside.
  useEffect(() => {
    if (!drawerOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      const node = drawerRef.current;
      if (!node) return;
      const target = node.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      target?.focus();
    };
    // One frame later, so the drawer is painted before focus lands inside it.
    const frame = window.requestAnimationFrame(focusFirst);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const node = drawerRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [drawerOpen]);

  // Search: focus the field as soon as the panel opens.
  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
  }, [searchOpen]);

  function toggleDrawer() {
    setDrawerOpen((open) => {
      if (!open) setSearchOpen(false);
      return !open;
    });
  }

  function toggleSearch() {
    setSearchOpen((open) => {
      if (!open) setDrawerOpen(false);
      return !open;
    });
  }

  return (
    <>
      <header className="site-header" data-scrolled={scrolled ? "true" : "false"}>
        <div className="ep-container site-header__inner">
          <div className="nav-shell">
            <Link className="nav-brand" href="/" aria-label="EPE LAWA — home">
              <BrandLockup size={34} />
            </Link>

            <nav className="nav-inline" aria-label="Main">
              <ul className="nav-inline__list">
                {inline.map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a className="nav-inline__link" href={item.href} rel="noopener">
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        className="nav-inline__link"
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

            <div className="nav-actions">
              <button
                ref={searchButtonRef}
                type="button"
                className="ep-icon-btn"
                aria-expanded={searchOpen}
                aria-controls={SEARCH_ID}
                aria-label={searchOpen ? "Close search" : "Search EPE LAWA"}
                onClick={toggleSearch}
              >
                <SearchIcon size={20} />
              </button>

              <ThemeToggle />

              <button
                ref={menuButtonRef}
                type="button"
                className="menu-btn"
                aria-expanded={drawerOpen}
                aria-controls={DRAWER_ID}
                aria-label={drawerOpen ? "Close menu" : "Open menu"}
                onClick={toggleDrawer}
              >
                {/* Two lines. They cross into a close mark when the drawer is open. */}
                <span className="menu-btn__lines" aria-hidden="true">
                  <span />
                  <span />
                </span>
              </button>
            </div>
          </div>

          <div className="search-panel" id={SEARCH_ID} data-open={searchOpen ? "true" : "false"}>
            <form className="search-panel__form" action="/search" method="get" role="search">
              <label className="ep-sr-only" htmlFor="site-search-input">
                Search news, people and businesses
              </label>
              <input
                ref={searchInputRef}
                id="site-search-input"
                className="search-panel__input"
                type="search"
                name="q"
                placeholder="Search news, people, businesses"
                autoComplete="off"
                tabIndex={searchOpen ? 0 : -1}
              />
              <button className="ep-btn ep-btn--primary search-panel__submit" type="submit" tabIndex={searchOpen ? 0 : -1}>
                Search
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="drawer-root" data-open={drawerOpen ? "true" : "false"}>
        <button
          type="button"
          className="drawer-scrim"
          aria-label="Close menu"
          tabIndex={drawerOpen ? 0 : -1}
          onClick={closeDrawer}
        />

        <div
          ref={drawerRef}
          id={DRAWER_ID}
          className="drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby={DRAWER_TITLE_ID}
          aria-hidden={drawerOpen ? undefined : "true"}
          inert={!drawerOpen}
        >
          <div className="drawer__head">
            <p className="drawer__title" id={DRAWER_TITLE_ID}>
              Menu
            </p>
            <button type="button" className="ep-icon-btn" aria-label="Close menu" onClick={closeDrawer}>
              <CloseIcon size={20} />
            </button>
          </div>

          <nav className="drawer__nav" aria-label="All sections">
            <ul className="drawer__list">
              {items.map((item) => (
                <li key={item.href}>
                  {item.external ? (
                    <a className="drawer__link" href={item.href} rel="noopener">
                      <span className="drawer__label">{item.label}</span>
                      {item.hint ? <span className="drawer__hint">{item.hint}</span> : null}
                    </a>
                  ) : (
                    <Link
                      className="drawer__link"
                      href={item.href}
                      aria-current={isCurrentPage(pathname, item.href) ? "page" : undefined}
                    >
                      <span className="drawer__label">{item.label}</span>
                      {item.hint ? <span className="drawer__hint">{item.hint}</span> : null}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="drawer__soon">
            <p className="drawer__soon-title">Opening soon</p>
            <ul className="drawer__soon-list">
              {upcomingSections.map((section) => (
                <li key={section.label} className="drawer__soon-item">
                  <span className="drawer__soon-label">{section.label}</span>
                  <span className="drawer__soon-detail">{section.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="drawer__foot">Epe Division, Lagos State</p>
        </div>
      </div>
    </>
  );
}
