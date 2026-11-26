"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import type { NavItem } from "../lib/navigation";
import { MOBILE_GROUPS } from "../lib/mobile-navigation";
import LanguageSwitch from "./language-switch";
import { type SiteLanguage, fullNavLabel, navGroupLabel, navLabel } from "../lib/i18n-messages";
import { ArrowRightIcon, ArrowUpRightIcon } from "./icons";
import { BrandLockup } from "./brand";
import NotificationCentre from "./notification-centre";
import SiteSearch from "./site-search";
import "./navigation-refinement.css";

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
const DESKTOP_GROUPS = [
  { label: "Community", routes: [["/events", "Events"], ["/itan-ilu-mi", "Ìtàn Ilú Mi"], ["/forum", "Forum"], ["/who-is-who", "Who is Who"]] },
  { label: "Discover", routes: [["/map", "Map & Navigation"], ["/business-directory", "Business Directory"], ["/tourism", "Tourism"], ["/gallery", "Gallery"], ["/radio", "Radio"]] },
  { label: "About", routes: [["/about", "About"], ["/contact", "Contact"], ["/guidelines", "Guidelines"], ["/advertise", "Advertise"], ["/newsletter", "Newsletter"], ["/support", "Support"], ["/photo-credits", "Photo credits"], ["/privacy", "Privacy"], ["/terms", "Terms"]] },
] as const;


function isCurrent(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

export default function SiteHeader({ items, lang = "en" }: { items: NavItem[]; lang?: SiteLanguage }) {
  const pathname = usePathname() ?? "/";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const desktopNavRef = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  const navItem = useCallback((href: string, fallbackLabel: string): NavItem =>
    items.find((item) => item.href === href) ?? { label: fallbackLabel, href }, [items]);

  const closeDesktopDisclosures = useCallback(() => {
    desktopNavRef.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((details) => {
      details.removeAttribute("open");
    });
  }, []);

  const handleDisclosureToggle = useCallback((event: SyntheticEvent<HTMLDetailsElement>) => {
    if (!event.currentTarget.open) return;
    desktopNavRef.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((details) => {
      if (details !== event.currentTarget) details.removeAttribute("open");
    });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  const renderLink = (href: string, label: string, className: string) => {
    const item = navItem(href, label);
    const display = lang === "en" ? item.label : fullNavLabel(lang, item.href, navLabel(lang, item.href, item.label));
    return <Link className={className} href={item.href} aria-current={isCurrent(pathname, item.href) ? "page" : undefined} key={item.href}>{display}</Link>;
  };

  const renderMobileGroup = (group: typeof MOBILE_GROUPS[number]) => (
    <section className="drawer-group" data-cols={group.routes.length > 4 ? "3" : "2"} key={group.label} aria-labelledby={`drawer-${group.label.toLowerCase().replaceAll(" ", "-")}`}>
      <h2 id={`drawer-${group.label.toLowerCase().replaceAll(" ", "-")}`}>{navGroupLabel(lang, group.label)}</h2>
      <ul>{group.routes.map(([href, label]) => {
        const item = navItem(href, label);
        return <li key={href}><Link className="drawer-link" href={item.href} aria-current={isCurrent(pathname, item.href) ? "page" : undefined}>{lang === "en" ? label : navLabel(lang, item.href, label)}</Link></li>;
      })}</ul>
    </section>
  );

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    closeDesktopDisclosures();
    if (drawerOpen) menuButtonRef.current?.focus();
    setDrawerOpen(false);
  }, [pathname, closeDesktopDisclosures, drawerOpen]);

  useEffect(() => {
    const onOutsideDisclosure = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!desktopNavRef.current?.contains(event.target)) closeDesktopDisclosures();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const opened = desktopNavRef.current?.querySelector<HTMLDetailsElement>("details[open]");
      if (!opened) return;
      event.preventDefault();
      opened.removeAttribute("open");
      opened.querySelector<HTMLElement>("summary")?.focus();
    };
    document.addEventListener("pointerdown", onOutsideDisclosure);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutsideDisclosure);
      document.removeEventListener("keydown", onEscape);
    };
  }, [closeDesktopDisclosures]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let frame = 0;
    let attempts = 0;
    const focusDrawer = () => {
      const first = drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
      if (first !== document.activeElement && attempts++ < 12) frame = requestAnimationFrame(focusDrawer);
    };
    frame = requestAnimationFrame(focusDrawer);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
        .filter((node) => node.offsetParent !== null);
      if (!nodes.length) return;
      if (event.shiftKey && document.activeElement === nodes[0]) {
        event.preventDefault();
        nodes[nodes.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) {
        event.preventDefault();
        nodes[0].focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onOutsideDrawer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (drawerRef.current?.contains(event.target) || menuButtonRef.current?.contains(event.target)) return;
      closeDrawer();
    };
    document.addEventListener("pointerdown", onOutsideDrawer);
    return () => document.removeEventListener("pointerdown", onOutsideDrawer);
  }, [drawerOpen, closeDrawer]);

  return (
    <header className="site-head site-head--home">
      <div className="masthead-bar">
        <Link className="nav-brand" href="/"><BrandLockup size={32} />{" "}<span className="home-brand-tagline">The Voice of Epe Division</span><span className="sr-only"> home page</span></Link>
        <nav ref={desktopNavRef} className="site-head__nav" aria-label="Primary navigation">
          <ul className="nav-items">
            <li>{renderLink("/news", "News", "nav-link")}</li>
            {DESKTOP_GROUPS.map((group) => {
              const groupItems = group.routes.map(([href, label]) => navItem(href, label));
              const active = groupItems.some((item) => isCurrent(pathname, item.href));
              return <li key={group.label}>
                <details className="nav-disclosure" onToggle={handleDisclosureToggle}>
                  <summary className="nav-link" data-active={active ? "true" : undefined}>
                    {navGroupLabel(lang, group.label)}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                  </summary>
                  <ul className="nav-disclosure__list" aria-label={`${group.label} pages`}>
                    {group.routes.map(([href, label]) => <li key={href}>{renderLink(href, label, "nav-link")}</li>)}
                  </ul>
                </details>
              </li>;
            })}
          </ul>
        </nav>
        <div className="masthead-actions">
          <LanguageSwitch lang={lang} className="lang-switch--masthead" buttonsOnly />
          <SiteSearch />
          <NotificationCentre />
          <Link className="header-signin" href="/login">Sign in</Link>
          <Link className="btn-primary header-cta" href="/auth">Join the community <ArrowRightIcon size={15} aria-hidden="true" /></Link>
          <button
            ref={menuButtonRef}
            className="btn-icon site-head__menu"
            type="button"
            aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={drawerOpen}
            aria-controls="site-drawer"
            onClick={() => {
              closeDesktopDisclosures();
              drawerOpen ? closeDrawer() : setDrawerOpen(true);
            }}
          >
            <span className="menu-lines" aria-hidden="true"><span /><span /></span>
          </button>
        </div>
      </div>
      <div className="drawer-root" data-open={drawerOpen ? "true" : "false"} aria-hidden={!drawerOpen} inert={!drawerOpen}>
        <button type="button" className="drawer-scrim" tabIndex={-1} aria-label="Close navigation menu" onClick={closeDrawer} />
        <div ref={drawerRef} id="site-drawer" className="drawer" role="dialog" aria-modal="true" aria-labelledby="site-drawer-title" inert={!drawerOpen}>
          <div className="drawer-heading">
            <div><p className="drawer-eyebrow">EPE LAWA</p><p id="site-drawer-title">Find your place in Epe.</p></div>
            <div className="drawer-heading__tools">
            <button className="btn-icon" type="button" aria-label="Close navigation menu" onClick={closeDrawer}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>
          </div>
          <nav className="drawer-nav" aria-label="All sections">
            {MOBILE_GROUPS.map(renderMobileGroup)}
          </nav>
          <section className="drawer-account" aria-labelledby="drawer-account-title">
            <div className="drawer-account__head"><h2 id="drawer-account-title">Account</h2><LanguageSwitch lang={lang} buttonsOnly /></div>
            <div className="drawer-account__actions">
              {renderLink("/auth", "Create account", "btn-primary")}
              {renderLink("/login", "Sign in", "btn-secondary")}
            </div>
          </section>
          <p className="drawer-foot">A shared home for everyone.</p>
        </div>
      </div>
    </header>
  );
}
