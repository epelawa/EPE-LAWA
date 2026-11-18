"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signOut } from "../app/auth/actions";
import BrandedDialog from "./branded-dialog";
import { BellIcon, SignOutIcon } from "./icons";
import styles from "../app/dashboard/dashboard.module.css";
import { MEMBER_SERVICE_LINKS } from "../lib/member-entry";

const MEMBER_LINKS = [
  { href: "/dashboard?tab=home", tab: "home", label: "Home", hint: "Breaking news and recommendations" },
  { href: "/dashboard?tab=discover", tab: "discover", label: "Discover", hint: "Search every published story" },
  { href: "/dashboard?tab=notifications", tab: "notifications", label: "Notifications", hint: "Replies, moderation and newsroom updates" },
  { href: "/dashboard?tab=saved", tab: "saved", label: "Saved", hint: "Stories you keep for later" },
  { href: "/dashboard?tab=profile", tab: "profile", label: "Profile", hint: "Your public member name and handle" },
] as const;

/**
 * Secondary member controls below the shared public masthead. The notification
 * bell, sign-out control and member menu remain available in the dashboard.
 */
export default function MemberTopbar({
  displayName,
  handle,
  unreadCount,
}: {
  displayName: string;
  handle: string;
  unreadCount: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() ?? "/dashboard";
  const searchParams = useSearchParams();
  const activeTab = pathname === "/dashboard" ? searchParams.get("tab") ?? "home" : "";

  return (
    <div className={styles.topbar} data-member-topbar>
      <div className={styles.topbarInner}>
        <p className={styles.topbarLabel}>Member space</p>
        <div className={styles.topbarActions}>
          <Link
            className={styles.iconButton}
            href="/dashboard?tab=notifications"
            aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
            title="Notifications"
          >
            <BellIcon size={20} />
            {unreadCount > 0 ? <span className={styles.notificationBadge} aria-hidden="true">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
          </Link>
          <form action={signOut} className={styles.topbarForm}>
            <button className={`${styles.iconButton} ${styles.signOutTop}`} type="submit" aria-label="Sign out" title="Sign out">
              <SignOutIcon size={19} />
              <span className={styles.signOutLabel}>Sign out</span>
            </button>
          </form>
          <button
            className={`${styles.iconButton} ${styles.menuTrigger}`}
            type="button"
            aria-label={menuOpen ? "Close member menu" : "Open member menu"}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span className={styles.memberMenuIcon} aria-hidden="true"><span /><span /><span /><span /></span>
          </button>
        </div>
      </div>

      <BrandedDialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Your EPE LAWA"
        description="Your member space, with the newsroom and community one tap away."
        className="member-menu-dialog"
      >
        <p className={styles.menuIdentity}>
          <strong>{displayName}</strong>
          <span>@{handle}</span>
        </p>
        <nav className={styles.menuNav} aria-label="Member menu">
          {MEMBER_LINKS.map((item) => (
            <Link
              key={item.tab}
              href={item.href}
              className={styles.menuLink}
              aria-current={pathname === "/dashboard" && activeTab === item.tab ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </Link>
          ))}
        </nav>
        <nav className={styles.menuNav} aria-label="Member services">
          <p className={styles.menuSectionLabel}>Member services</p>
          {MEMBER_SERVICE_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={styles.menuLink} onClick={() => setMenuOpen(false)}>
              <span>{item.label}</span>
              <small>{item.description}</small>
            </Link>
          ))}
        </nav>
        <div className={styles.menuFooter}>
          <Link className="btn-secondary" href="/news" onClick={() => setMenuOpen(false)}>Back to EPE LAWA news</Link>
          <form action={signOut}>
            <button className="btn-primary" type="submit">Sign out</button>
          </form>
        </div>
      </BrandedDialog>
    </div>
  );
}
