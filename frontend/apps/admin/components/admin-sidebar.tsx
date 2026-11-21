"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "@epelawa/ui";
import { staffHref } from "../lib/admin-path";
import { groupedNavigation } from "../lib/navigation";
import type { NavItem } from "../lib/navigation";
import { signOutStaffSameOrigin } from "../lib/session-actions";
import { BrandLockup } from "./brand";
import QueueLiveCounts from "./queue-live-counts";

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
  const sections = groupedNavigation(items);
  const displayName = userEmail && userEmail.trim() ? userEmail : "Staff";
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const nav = (onNavigate?: () => void) => (
    <nav className="admin-sidebar__nav" aria-label="Staff sections">
      {sections.map((section) => (
        <div className="admin-sidebar__group" key={section.label}>
          <p className="admin-sidebar__group-label" id={`sidebar-group-${section.label.toLowerCase()}`}>{section.label}</p>
          <ul>
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={staffHref(item.href, basePath)}
                  className={isCurrent(path, item.href) ? "admin-sidebar__link admin-sidebar__link--active" : "admin-sidebar__link"}
                  aria-current={isCurrent(path, item.href) ? "page" : undefined}
                  onClick={onNavigate}
                >{item.label}</Link>
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
        <form action={signOutStaffSameOrigin}>
          <button className="admin-sidebar__signout" type="submit">Sign out</button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <header className="admin-topbar">
        <Link className="nav-brand" href={staffHref("/", basePath)}><BrandLockup size={28} /></Link>
        <button
          ref={trigger}
          type="button"
          className="btn-icon admin-menu-button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="admin-drawer"
          onClick={() => setOpen((value) => !value)}
        ><MenuIcon size={20} /></button>
      </header>
      <aside className="admin-sidebar" aria-label="Staff workspace">
        <div className="admin-sidebar__brand"><Link href={staffHref("/", basePath)}><BrandLockup size={30} /></Link></div>
        {nav()}
        <QueueLiveCounts />
        {identity}
      </aside>
      <div className="drawer-root" data-open={open ? "true" : "false"} aria-hidden={!open} inert={!open}>
        <button className="drawer-scrim" type="button" tabIndex={-1} aria-label="Close menu" onClick={close} />
        <div className="drawer" id="admin-drawer" ref={panel} role="dialog" aria-modal="true" aria-labelledby="admin-drawer-title" data-sidebar="true">
          <div className="drawer__head">
            <h2 id="admin-drawer-title">Staff workspace</h2>
            <button className="btn-icon" type="button" aria-label="Close menu" onClick={close}><CloseIcon size={20} /></button>
          </div>
          {nav(close)}
          {identity}
        </div>
      </div>
    </>
  );
}
