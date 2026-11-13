"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { primaryNavigation, type NavItem } from "../lib/navigation";
import { ArrowRightIcon, ArrowUpRightIcon } from "./icons";
import ThemeToggle from "./theme-toggle";
import { BrandLockup } from "./brand";
import "./navigation-refinement.css";

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
const current = (path: string, href: string) => href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);

export default function SiteHeader({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLDetailsElement>(null);
  const previousPath = useRef(pathname);
  const inline = primaryNavigation(items);
  const more = items.filter(item => !item.primary);
  const closeDrawer = useCallback(() => { setDrawerOpen(false); menuButtonRef.current?.focus(); }, []);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    moreRef.current?.removeAttribute("open");
    if (drawerRef.current && !drawerRef.current.inert) menuButtonRef.current?.focus();
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onOutsideDrawer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (drawerRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      setDrawerOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onOutsideDrawer);
    return () => document.removeEventListener("pointerdown", onOutsideDrawer);
  }, [drawerOpen]);

  useEffect(() => {
    const onOutside = (event: PointerEvent) => {
      if (moreRef.current?.open && !moreRef.current.contains(event.target as Node)) moreRef.current.open = false;
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && moreRef.current?.open) {
        moreRef.current.open = false;
        moreRef.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => { document.removeEventListener("pointerdown", onOutside); document.removeEventListener("keydown", onEscape); };
  }, []);

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
      if (event.key === "Escape") { event.preventDefault(); closeDrawer(); return; }
      if (event.key !== "Tab") return;
      const nodes = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(node => node.offsetParent !== null);
      if (!nodes.length) return;
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes[nodes.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) { event.preventDefault(); nodes[0].focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [drawerOpen, closeDrawer]);

  return <header className="site-head">
    <div className="masthead-bar">
      <Link className="nav-brand" href="/"><BrandLockup size={30} /></Link>
      <nav className="site-head__nav" aria-label="Main">
        <ul className="nav-items">
          {inline.map(item => <li key={item.href}><Link className="nav-link" href={item.href} aria-current={current(pathname,item.href) ? "page" : undefined}>{item.label}</Link></li>)}
          <li><details className="nav-more" ref={moreRef}><summary className="nav-link">More <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary><ul className="nav-more__list" aria-label="More sections">{more.map(item => <li key={item.href}><Link className="nav-link" href={item.href} aria-current={current(pathname,item.href) ? "page" : undefined}>{item.label}</Link></li>)}</ul></details></li>
        </ul>
      </nav>
      <div className="masthead-actions"><Link className="header-signin" href="/login">Sign in</Link><Link className="btn-primary header-cta" href="/auth">Join the community <ArrowRightIcon size={15} aria-hidden="true" /></Link><button ref={menuButtonRef} className="btn-icon site-head__menu" type="button" aria-label={drawerOpen ? "Close menu" : "Open menu"} aria-expanded={drawerOpen} aria-controls="site-drawer" onClick={() => drawerOpen ? closeDrawer() : setDrawerOpen(true)}><span className="menu-lines" aria-hidden="true"><span /><span /></span></button></div>
    </div>
    <div className="drawer-root" data-open={drawerOpen ? "true" : "false"} aria-hidden={!drawerOpen} inert={!drawerOpen}>
      <button type="button" className="drawer-scrim" tabIndex={-1} aria-label="Close menu" onClick={closeDrawer} />
      <div ref={drawerRef} id="site-drawer" className="drawer" role="dialog" aria-modal="true" aria-labelledby="site-drawer-title" inert={!drawerOpen}>
        <div className="drawer-heading"><p id="site-drawer-title">Find your place in Epe.</p><button className="btn-icon" type="button" aria-label="Close menu" onClick={closeDrawer}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>
        <nav className="drawer-nav" aria-label="All sections"><ul>{items.map(item => <li key={item.href}><Link className="drawer-link" href={item.href} aria-current={current(pathname,item.href) ? "page" : undefined}><span className="drawer-label">{item.label}</span>{item.hint ? <span className="drawer-hint">{item.hint}</span> : null}</Link></li>)}</ul></nav>
        <div className="drawer-appearance" role="group" aria-label="Appearance settings">
          <span className="drawer-appearance__label">Appearance</span>
          <ThemeToggle />
        </div>
        <div className="drawer-account" aria-label="Member account"><Link className="btn-primary" href="/auth">Create account <ArrowUpRightIcon size={15} aria-hidden="true" /></Link><Link className="btn-secondary" href="/login">Sign in</Link></div>
        <p className="drawer-foot">A shared home for everyone.</p>
      </div>
    </div>
  </header>;
}
