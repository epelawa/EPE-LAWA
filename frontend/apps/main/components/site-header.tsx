"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ThemeToggle from "./theme-toggle";
import { BrandLockup } from "./brand";
import { primaryNavigation, type NavItem } from "../lib/navigation";

const DRAWER_ID = "site-drawer";
const DRAWER_TITLE_ID = "site-drawer-title";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

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

/**
 * Site header.
 *
 * One compact row: brand, five destinations, theme, menu. The drawer holds the
 * same five plus Guidelines and Gallery. There is no search control because
 * there is no `/search` route — a search box that submits nowhere is a dead
 * control, not a feature.
 */
export default function SiteHeader({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const scrolled = useScrolled();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const inline = primaryNavigation(items);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      const node = drawerRef.current;
      if (!node) return;
      node.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    };
    const frame = window.requestAnimationFrame(focusFirst);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const node = drawerRef.current;
      if (!node) return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
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

  return (
    <header className="site-head" data-scrolled={scrolled ? "true" : "false"}>
      <div className="ep-container">
        <div className="site-head__inner">
          <Link className="nav-brand" href="/" aria-label="EPE LAWA — home">
            <BrandLockup size={30} />
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
            </ul>
          </nav>

          <div className="site-head__actions">
            <ThemeToggle />

            <button
              ref={menuButtonRef}
              type="button"
              className="menu-btn site-head__menu"
              aria-expanded={drawerOpen}
              aria-controls={DRAWER_ID}
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              onClick={() => setDrawerOpen((open) => !open)}
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
          <div className="flex items-center justify-between px-6 py-3 border-b">
            <p className="drawer-title" id={DRAWER_TITLE_ID}>
              Menu
            </p>
            <button
              type="button"
              className="btn-icon"
              aria-label="Close menu"
              onClick={closeDrawer}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <nav className="drawer-nav" aria-label="All sections">
            <ul className="py-2">
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

          <p className="drawer-foot text-xs px-6 py-4 border-t">
            Epe Division, Lagos State
          </p>
        </div>
      </div>
    </header>
  );
}
