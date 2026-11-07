"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { primaryNavigation, type NavItem } from "../lib/navigation";
import { ArrowRightIcon } from "./icons";
import ThemeToggle from "./theme-toggle";
import { BrandLockup } from "./brand";

const DRAWER_ID = "site-drawer";
const DRAWER_TITLE_ID = "site-drawer-title";
const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

function isCurrentPage(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const focusFrameRef = useRef<number | null>(null);
  const previousPathnameRef = useRef(pathname);
  const inline = primaryNavigation(items);
  const moreItems = items.filter((item) => !item.primary);

  const cancelDrawerFocus = useCallback(() => {
    if (focusFrameRef.current !== null) {
      window.cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = null;
    }
  }, []);

  const focusFirstDrawerItem = useCallback(() => {
    const focusWhenVisible = (attempt = 0) => {
      const node = drawerRef.current;
      const root = node?.closest<HTMLElement>(".drawer-root");
      if (!node || !root || node.inert || root.dataset.open !== "true" || attempt >= 60) return;
      if (window.getComputedStyle(root).visibility !== "visible") {
        focusFrameRef.current = window.requestAnimationFrame(() => {
          focusFrameRef.current = null;
          focusWhenVisible(attempt + 1);
        });
        return;
      }
      const first = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).find(
        (element) => element.offsetParent !== null,
      );
      first?.focus();
    };
    focusWhenVisible();
  }, []);

  const scheduleDrawerFocus = useCallback(() => {
    cancelDrawerFocus();
    focusFrameRef.current = window.requestAnimationFrame(() => {
      focusFrameRef.current = null;
      focusFirstDrawerItem();
    });
  }, [cancelDrawerFocus, focusFirstDrawerItem]);

  const closeDrawer = useCallback(() => {
    cancelDrawerFocus();
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }, [cancelDrawerFocus]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    const wasOpen = drawerRef.current ? !drawerRef.current.inert : false;
    setDrawerOpen(false);
    cancelDrawerFocus();
    if (wasOpen) menuButtonRef.current?.focus();
  }, [pathname, cancelDrawerFocus]);

  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;

      const node = drawerRef.current;
      const focusable = node
        ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (element) => element.offsetParent !== null,
          )
        : [];
      if (!focusable.length) return;

      if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault();
        focusable[0].focus();
      } else if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    scheduleDrawerFocus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      cancelDrawerFocus();
    };
  }, [drawerOpen, closeDrawer, scheduleDrawerFocus, cancelDrawerFocus]);

  return (
    <header className="site-head">
      <div className="ep-container">
        <div className="site-head__inner">
          <Link className="nav-brand" href="/">
            <BrandLockup size={32} />
          </Link>

          <nav className="site-head__nav" aria-label="Main">
            <ul className="site-head__list">
              {inline.map((item) => (
                <li key={item.href}>
                  <Link
                    className="nav-link"
                    href={item.href}
                    aria-current={isCurrentPage(pathname, item.href) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {moreItems.length > 0 ? (
                <li>
                  <details className="site-head__more">
                    <summary className="nav-link site-head__more-trigger">
                      More
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </summary>
                    <ul className="site-head__more-list" aria-label="More sections">
                      {moreItems.map((item) => (
                        <li key={item.href}>
                          <Link
                            className="nav-link"
                            href={item.href}
                            aria-current={isCurrentPage(pathname, item.href) ? "page" : undefined}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ) : null}
            </ul>
          </nav>

          <div className="site-head__actions">
            <ThemeToggle />
            <Link className="header-signin" href="/login">Sign in</Link>
            <Link className="header-cta" href="/news">
              Explore <ArrowRightIcon size={16} aria-hidden="true" />
            </Link>
            <button
              ref={menuButtonRef}
              type="button"
              className="menu-btn site-head__menu"
              aria-expanded={drawerOpen}
              aria-controls={DRAWER_ID}
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              onClick={() => {
                if (drawerOpen) closeDrawer();
                else {
                  setDrawerOpen(true);
                  scheduleDrawerFocus();
                }
              }}
            >
              <span className="menu-btn__lines" aria-hidden="true">
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
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
          <div className="drawer-heading">
            <p id={DRAWER_TITLE_ID}>Explore EPE LAWA</p>
            <button type="button" className="btn-icon" aria-label="Close menu" onClick={closeDrawer}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <nav className="drawer-nav" aria-label="All sections">
            <ul>
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    className="drawer-link"
                    href={item.href}
                    aria-current={isCurrentPage(pathname, item.href) ? "page" : undefined}
                  >
                    <span className="drawer-label">{item.label}</span>
                    {item.hint ? <span className="drawer-hint">{item.hint}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="drawer-account" aria-label="Member account">
            <Link href="/login">Sign in</Link>
            <Link href="/auth">Create account</Link>
          </div>
          <p className="drawer-foot">Epe Division · Lagos State</p>
        </div>
      </div>
    </header>
  );
}
