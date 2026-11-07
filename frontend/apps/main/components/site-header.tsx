"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    setDrawerOpen(false);
    setSearchOpen(false);
  }, [pathname]);

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
      <header
        className={`site-header sticky top-0 z-50 ${
          scrolled ? "shadow-sm border-b" : ""
        } transition-all duration-300`}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4 w-full">
            <Link className="nav-brand" href="/" aria-label="EPE LAWA — home">
              <BrandLockup size={32} />
            </Link>

            <ThemeToggle />

            <nav className="hidden md:flex items-center gap-6" aria-label="Main">
              <ul className="flex items-center gap-6">
                {inline.map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a
                        className="nav-link"
                        href={item.href}
                        rel="noopener"
                        target="_blank"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        className="nav-link"
                        href={item.href}
                        aria-current={
                          isCurrentPage(pathname, item.href) ? "page" : undefined
                        }
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-2">
              <button
                ref={searchButtonRef}
                type="button"
                className="btn-icon"
                aria-expanded={searchOpen}
                aria-controls={SEARCH_ID}
                aria-label={searchOpen ? "Close search" : "Search EPE LAWA"}
                onClick={toggleSearch}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>

              <button
                ref={menuButtonRef}
                type="button"
                className="menu-btn"
                aria-expanded={drawerOpen}
                aria-controls={DRAWER_ID}
                aria-label={drawerOpen ? "Close menu" : "Open menu"}
                onClick={toggleDrawer}
              >
                <span className="menu-btn__lines" aria-hidden="true">
                  <span />
                  <span />
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="search-panel" id={SEARCH_ID} data-open={searchOpen ? "true" : "false"}>
          <form className="flex gap-2 px-4 py-3" action="/search" method="get" role="search">
            <label className="sr-only" htmlFor="site-search-input">
              Search news, people and businesses
            </label>
            <input
              ref={searchInputRef}
              id="site-search-input"
              className="input flex-1"
              type="search"
              name="q"
              placeholder="Search news, people, businesses"
              autoComplete="off"
              tabIndex={searchOpen ? 0 : -1}
            />
            <button
              className="btn-primary"
              type="submit"
              tabIndex={searchOpen ? 0 : -1}
            >
              Search
            </button>
          </form>
        </div>

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
            <div className="flex items-center justify-between px-6 py-4 border-b border">
              <p className="drawer-title" id={DRAWER_TITLE_ID}>
                Menu
              </p>
              <button type="button" className="btn-icon" aria-label="Close menu" onClick={closeDrawer}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="drawer-nav" aria-label="All sections">
              <ul className="py-4">
                {items.map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a
                        className="drawer-link"
                        href={item.href}
                        rel="noopener"
                        target="_blank"
                      >
                        <span className="drawer-label">{item.label}</span>
                        {item.hint ? <span className="drawer-hint">{item.hint}</span> : null}
                      </a>
                    ) : (
                      <Link
                        className="drawer-link"
                        href={item.href}
                        aria-current={
                          isCurrentPage(pathname, item.href) ? "page" : undefined
                        }
                      >
                        <span className="drawer-label">{item.label}</span>
                        {item.hint ? <span className="drawer-hint">{item.hint}</span> : null}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            <div className="p-6 border-t border">
              <p className="drawer-soon-title text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Opening soon
              </p>
              <ul className="space-y-2">
                {upcomingSections.map((section) => (
                  <li key={section.label} className="drawer-soon-item flex items-center justify-between py-2 border-b border last:border-0 text-sm">
                    <span className="drawer-soon-label text-foreground">{section.label}</span>
                    <span className="drawer-soon-detail text-muted-foreground">{section.detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="drawer-foot text-xs text-muted-foreground px-6 py-4 border-t border">
              Epe Division, Lagos State
            </p>
          </div>
        </div>
      </header>
    </>
  );
}
