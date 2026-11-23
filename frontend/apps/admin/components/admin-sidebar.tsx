"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, startTransition } from "react";
import { CloseIcon, MenuIcon } from "@epelawa/ui";
import { staffHref } from "../lib/admin-path";
import { groupedNavigation } from "../lib/navigation";
import type { NavItem } from "../lib/navigation";
import { signOutStaffSameOrigin } from "../lib/session-actions";
import { BrandLockup } from "./brand";
import QueueLiveCounts from "./queue-live-counts";
import { useLiveQueueCounts, type QueueCounts } from "./use-live-queue-counts";

const isCurrent = (path: string, href: string) =>
  href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);

const BADGE_KEYS: Partial<Record<string, keyof QueueCounts>> = {
  "/business-review": "submissions",
  "/people": "corrections",
  "/enquiries": "enquiries",
  "/appeals": "appeals",
  "/moderation/forum": "forumReports",
};

// NavLink component with immediate spinner and full page reload
function NavLink({ href, children, className, isActive }: { href: string; children: React.ReactNode; className?: string; isActive?: boolean }) {
  const [isPending, setIsPending] = useState(false);
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsPending(true);
    // Use startTransition for better UX
    startTransition(() => {
      // Full page reload
      window.location.href = href;
    });
  };
  
  return (
    <a
      href={href}
      onClick={handleClick}
      className={`${className || ""} ${isPending ? "admin-sidebar__link--busy" : ""}`.trim()}
      aria-busy={isPending}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
      {isPending && <span className="admin-sidebar__nav-spinner" data-active="true" aria-hidden="true" />}
    </a>
  );
}

function NavigationFeedback({ active, label }: { active: boolean; label: string }) {
  const { pending } = useLinkStatus();
  const busy = active || pending;
  return <><span className="admin-sidebar__nav-spinner" data-active={busy ? "true" : "false"} aria-hidden="true" /><span className="sr-only" role="status" aria-live="polite">{busy ? `Loading ${label}` : ""}</span></>;
}

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
  const router = useRouter();
  const base = basePath === "/" ? "" : basePath.replace(/\/+$/, "");
  const path = base && (pathname === base || pathname.startsWith(`${base}/`))
    ? pathname.slice(base.length) || "/"
    : pathname;
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (open && panel.current) {
      panel.current.scrollTop = (() => {
        try { return Number(sessionStorage.getItem("epe-admin-drawer-scroll")) || 0; }
        catch { return 0; }
      })();
    }
  }, [open]);
  const sections = groupedNavigation(items);
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    setPendingHref(null);
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }, [pathname]);
  const { counts, flick } = useLiveQueueCounts();
  const badgeFor = (href: string) => {
    const key = BADGE_KEYS[href];
    if (!key || !counts || typeof counts[key] !== "number" || (counts[key] as number) <= 0) return null;
    return counts[key] as number;
  };
  const flickFor = (href: string) => flick !== null && BADGE_KEYS[href] === flick;
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

  const nav = () => (
    <nav className="admin-sidebar__nav" aria-label="Staff sections">
      {sections.map((section) => (
        <div className="admin-sidebar__group" key={section.label}>
          <p className="admin-sidebar__group-label" id={`sidebar-group-${section.label.toLowerCase()}`}>{section.label}</p>
          <ul>
            {section.items.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={staffHref(item.href, basePath)}
                  className={isCurrent(path, item.href) ? "admin-sidebar__link admin-sidebar__link--active" : "admin-sidebar__link"}
                  isActive={isCurrent(path, item.href)}
                >
                  <span className="admin-sidebar__label">{item.label}</span>
                  {badgeFor(item.href) !== null ? <sup className={flickFor(item.href) ? "admin-sidebar__badge admin-sidebar__badge--hot" : "admin-sidebar__badge"} aria-label={`${badgeFor(item.href)} waiting`} title={`${badgeFor(item.href)} waiting on you`}>{badgeFor(item.href)}</sup> : null}
                  {item.comingSoon ? <span className="admin-sidebar__soon">Coming soon</span> : null}
                </NavLink>
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
        <NavLink className="nav-brand" href={staffHref("/", basePath)}><BrandLockup size={28} /></NavLink>
        <div className="admin-topbar__actions">
          <form action={signOutStaffSameOrigin}>
            <button className="admin-topbar__signout" type="submit">Sign out</button>
          </form>
          <button
            ref={trigger}
            type="button"
            className="btn-icon admin-menu-button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="admin-drawer"
            onClick={() => setOpen((value) => !value)}
          ><MenuIcon size={20} /></button>
        </div>
      </header>
      <aside className="admin-sidebar" aria-label="Staff workspace">
        <div className="admin-sidebar__brand"><NavLink href={staffHref("/", basePath)}><BrandLockup size={30} /></NavLink></div>
        {nav()}
        <QueueLiveCounts />
        {identity}
      </aside>
      <div className="drawer-root" data-open={open ? "true" : "false"} aria-hidden={!open} inert={!open}>
        <button className="drawer-scrim" type="button" tabIndex={-1} aria-label="Close menu" onClick={close} />
        <div
          className="drawer"
          id="admin-drawer"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-drawer-title"
          data-sidebar="true"
          onScroll={() => {
            try { sessionStorage.setItem("epe-admin-drawer-scroll", String(panel.current?.scrollTop ?? 0)); } catch {}
          }}
        >
          <div className="drawer__head">
            <h2 id="admin-drawer-title">Staff workspace</h2>
            <button className="btn-icon" type="button" aria-label="Close menu" onClick={close}><CloseIcon size={20} /></button>
          </div>
          {nav()}
          {identity}
        </div>
      </div>
    </>
  );
}
