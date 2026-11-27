"use client";

import AdminLink from "./admin-link";
import { SubmitButton } from "@epelawa/ui";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "@epelawa/ui";
import { staffHref } from "../lib/admin-path";
import { groupedNavigation } from "../lib/navigation";
import type { NavItem } from "../lib/navigation";
import { signOutStaffManual } from "../lib/session-actions";
import { BrandLockup } from "./brand";
import QueueLiveCounts from "./queue-live-counts";
import ThemeToggle from "./theme-toggle";
import LiveDots from "./live-dots";
import { anyLive, useLiveQueueCounts } from "./use-live-queue-counts";
import { useDrawerMemory } from "./use-drawer-memory";

const isCurrent = (path: string, href: string) =>
  href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);

export default function AdminSidebar({
  items,
  basePath = "",
  userEmail,
  userRole = "Staff",
}: {
  items: NavItem[];
  basePath?: string;
  userEmail?: string | null;
  userRole?: string;
}) {
  const pathname = usePathname() ?? "/";
  const base = basePath === "/" ? "" : basePath.replace(/\/+$/, "");
  const path = base && (pathname === base || pathname.startsWith(`${base}/`))
    ? pathname.slice(base.length) || "/"
    : pathname;
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousPath = useRef(pathname);

  const list = useRef<HTMLDivElement>(null);
  const { onScroll, remember } = useDrawerMemory(open, list, "epe-admin-drawer");
  const sections = groupedNavigation(items);
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    setOpen(false);
    if (open) requestAnimationFrame(() => trigger.current?.focus());
  }, [pathname, open]);
  const { counts, flick } = useLiveQueueCounts();
  const somethingLive = anyLive(counts);
  const displayName = userEmail && userEmail.trim() ? userEmail : "Staff";
  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key !== "Tab") return;
      const nodes = [...(panel.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? [])];
      const boundary = event.shiftKey ? nodes[0] : nodes.at(-1);
      if (document.activeElement === boundary) {
        event.preventDefault();
        (event.shiftKey ? nodes.at(-1) : nodes[0])?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, close]);

  const nav = (onNavigate?: (href: string) => void) => (
    <nav className="admin-sidebar__nav" aria-label="Staff sections">
      {sections.map((section) => (
        <div className="admin-sidebar__group" key={section.label}>
          <p className="admin-sidebar__group-label" id={`sidebar-group-${section.label.toLowerCase()}`}>{section.label}</p>
          <ul>
            {section.items.map((item) => (
              <li key={item.href}>
                <AdminLink
                  href={staffHref(item.href, basePath)}
                  className={isCurrent(path, item.href) ? "admin-sidebar__link admin-sidebar__link--active" : "admin-sidebar__link"}
                  aria-current={isCurrent(path, item.href) ? "page" : undefined}
                  pendingLabel={item.label}
                  data-nav-href={item.href}
                  onClick={onNavigate ? () => onNavigate(item.href) : undefined}
                >
                  <span className="admin-sidebar__label">{item.label}</span>
                  <LiveDots counts={counts} href={item.href} flick={flick} className="admin-sidebar__badges" />
                  {item.comingSoon ? <span className="admin-sidebar__soon">Coming soon</span> : null}
                </AdminLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const identity = (
    <div className="admin-sidebar__user">
      <div className="admin-sidebar__identity">
        <span className="admin-sidebar__avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>
        <span className="admin-sidebar__name" title={displayName}>{displayName}</span>
      </div>
      <span className="admin-sidebar__role">{userRole}</span>
      <div className="admin-sidebar__userActions">
        <a className="admin-sidebar__public" href="https://epelawa.vercel.app">
          View public site <span aria-hidden="true">↗</span>
        </a>
        <form action={signOutStaffManual}>
          <SubmitButton className="admin-sidebar__signout" pendingLabel="Signing out…">Sign out</SubmitButton>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <header className="admin-topbar">
        <AdminLink className="nav-brand" href={staffHref("/", basePath)}><BrandLockup size={28} /></AdminLink>
        <div className="admin-topbar__actions">
          <ThemeToggle />
          <form action={signOutStaffManual}>
            <SubmitButton className="admin-topbar__signout" pendingLabel="Signing out…">Sign out</SubmitButton>
          </form>
          <button
            ref={trigger}
            type="button"
            className="btn-icon admin-menu-button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="admin-drawer"
            onClick={() => setOpen((value) => !value)}
          ><MenuIcon size={20} />{somethingLive ? <span className="admin-menu-button__dot" aria-hidden="true" /> : null}</button>
        </div>
      </header>
      <aside className="admin-sidebar" aria-label="Staff workspace">
        <div className="admin-sidebar__brand"><AdminLink href={staffHref("/", basePath)}><BrandLockup size={30} /></AdminLink></div>
        {nav()}
        <QueueLiveCounts counts={counts} flick={flick} />
        {identity}
      </aside>
      <div className="drawer-root" data-open={open ? "true" : "false"} aria-hidden={!open} inert={!open}>
        <button className="drawer-scrim" type="button" tabIndex={-1} aria-label="Close menu" onClick={close} />
        <div
          className="drawer drawer--pinned"
          id="admin-drawer"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-drawer-title"
          data-sidebar="true"
        >
          {/* The header with the close button stays fixed; only the list below it scrolls. */}
          <div className="drawer__head">
            <h2 id="admin-drawer-title">Staff workspace</h2>
            <button className="btn-icon" type="button" aria-label="Close menu" onClick={close}><CloseIcon size={20} /></button>
          </div>
          <div className="drawer__body" ref={list} onScroll={onScroll}>
            {nav((href) => { remember(href); close(); })}
            {identity}
          </div>
        </div>
      </div>
    </>
  );
}
