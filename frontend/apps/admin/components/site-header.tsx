"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "@epelawa/ui";
import { staffHref } from "../lib/admin-path";
import type { NavItem } from "../lib/navigation";
import ThemeToggle from "./theme-toggle";
import { BrandLockup } from "./brand";

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
const isCurrent = (path: string, href: string) =>
  href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);

export default function SiteHeader({
  items,
  basePath = "",
}: {
  items: NavItem[];
  basePath?: string;
}) {
  const pathname = usePathname() ?? "/";
  const base = basePath === "/" ? "" : basePath.replace(/\/+$/, "");
  const path = base && (pathname === base || pathname.startsWith(`${base}/`))
    ? pathname.slice(base.length) || "/"
    : pathname;
  const previousPath = useRef(pathname);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const login = path === "/login";
  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    if (open) trigger.current?.focus();
    setOpen(false);
  }, [pathname, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let frame = 0;
    let attempts = 0;
    const focusDrawer = () => {
      const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
      if (first !== document.activeElement && attempts++ < 12) frame = requestAnimationFrame(focusDrawer);
    };
    frame = requestAnimationFrame(focusDrawer);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
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
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  return <>
    <header className="admin-masthead">
      <div className="admin-masthead__bar">
        <Link className="nav-brand" href={staffHref("/", basePath)}><BrandLockup size={32} /></Link>
        <span className="admin-masthead__label">Staff workspace</span>
        <div className="admin-masthead__actions">
          <a className="admin-public-link" href="https://epelawa.vercel.app">
            Public site <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>
          </a>
          <ThemeToggle />
          {!login ? <button
            ref={trigger}
            type="button"
            className="btn-icon admin-menu-button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="admin-drawer"
            onClick={() => open ? close() : setOpen(true)}
          ><MenuIcon size={20} /></button> : null}
        </div>
      </div>
      {!login ? <nav className="admin-nav" aria-label="Staff sections">
        <ul>{items.map((item) => <li key={item.href}>
          <Link href={staffHref(item.href, basePath)} aria-current={isCurrent(path, item.href) ? "page" : undefined}>{item.label}</Link>
        </li>)}</ul>
      </nav> : null}
    </header>
    {!login ? <div className="drawer-root" data-open={open ? "true" : "false"} aria-hidden={!open} inert={!open}>
      <button className="drawer-scrim" type="button" tabIndex={-1} aria-label="Close menu" onClick={close} />
      <div className="drawer" id="admin-drawer" ref={panel} role="dialog" aria-modal="true" aria-labelledby="admin-drawer-title">
        <div className="drawer__head">
          <h2 id="admin-drawer-title">Your workspace</h2>
          <button className="btn-icon" type="button" aria-label="Close menu" onClick={close}><CloseIcon size={20} /></button>
        </div>
        <nav aria-label="All staff sections"><ul className="admin-drawer-links">
          {items.map((item) => <li key={item.href}>
            <Link href={staffHref(item.href, basePath)} aria-current={isCurrent(path, item.href) ? "page" : undefined}>
              <span>{item.label}</span>{item.hint ? <small>{item.hint}</small> : null}
            </Link>
          </li>)}
        </ul></nav>
        <p className="drawer__foot">Authorised staff only. All publishing and moderation remains capability-gated.</p>
      </div>
    </div> : null}
  </>;
}
