"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "@epelawa/ui";
import ThemeToggle from "./theme-toggle";
import { BrandLockup } from "./brand";
import { primaryNavigation, type NavItem } from "../lib/navigation";

const DRAWER_ID = "admin-drawer";
const DRAWER_TITLE_ID = "admin-drawer-title";

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
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const inline = primaryNavigation(items);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (drawerOpen) {
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

  function toggleDrawer() {
    setDrawerOpen((open) => {
      return !open;
    });
  }
  return (
    <>
      <header className="site-header" data-scrolled={scrolled ? "true" : "false"}>
        <div className="ep-container site-header__inner">
          <div className="nav-shell">
            <Link className="nav-brand" href="/">
              <BrandLockup size={32} />
            </Link>
            <ThemeToggle />
            <nav className="nav-inline" aria-label="Main">
              <ul className="nav-inline__list">
                {inline.map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a className="nav-inline__link" href={item.href} rel="noopener">{item.label}</a>
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
              <MenuIcon size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="drawer-root" data-open={drawerOpen ? "true" : "false"}>
        <button type="button" className="drawer-scrim" aria-label="Close menu" tabIndex={drawerOpen ? 0 : -1} onClick={closeDrawer} />
        <div ref={drawerRef} id={DRAWER_ID} className="drawer" role="dialog" aria-modal="true" aria-labelledby={DRAWER_TITLE_ID} aria-hidden={drawerOpen ? undefined : "true"} inert={!drawerOpen}>
          <div className="drawer__head">
            <p className="drawer__title" id={DRAWER_TITLE_ID}>Menu</p>
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
                    <Link className="drawer__link" href={item.href} aria-current={isCurrentPage(pathname, item.href) ? "page" : undefined}>
                      <span className="drawer__label">{item.label}</span>
                      {item.hint ? <span className="drawer__hint">{item.hint}</span> : null}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <p className="drawer__foot">Epe Division, Lagos State</p>
        </div>
      </div>
    </>
  );
}
