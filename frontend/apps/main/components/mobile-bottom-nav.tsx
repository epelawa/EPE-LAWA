"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";
import {
  dashboardNavigationCurrentState,
  mobileNavigationCurrentState,
  shouldRenderMobileNavigation,
  type DashboardNavigationKey,
  type MobileNavigationKey,
} from "../lib/navigation";
import { BookmarkIcon, CompassIcon, HomeIcon, NewsTabIcon, UserIcon } from "./icons";

type IconComponent = ComponentType<{ size?: number; className?: string }>;
type PublicTab = { key: MobileNavigationKey; href: string; label: string; Icon: IconComponent };
type DashboardTab = { key: DashboardNavigationKey; href: string; label: string; Icon: IconComponent };

const PUBLIC_TABS: PublicTab[] = [
  { key: "home", href: "/", label: "Home", Icon: HomeIcon },
  { key: "news", href: "/news", label: "News", Icon: NewsTabIcon },
  { key: "discover", href: "/tourism", label: "Discover", Icon: CompassIcon },
  { key: "account", href: "/dashboard", label: "Account", Icon: UserIcon },
];

const DASHBOARD_TABS: DashboardTab[] = [
  { key: "dashboardHome", href: "/dashboard#home", label: "Home", Icon: HomeIcon },
  { key: "dashboardDiscover", href: "/dashboard#discover", label: "Discover", Icon: CompassIcon },
  { key: "dashboardSaved", href: "/dashboard#saved", label: "Saved", Icon: BookmarkIcon },
  { key: "dashboardProfile", href: "/dashboard#profile", label: "Profile", Icon: UserIcon },
];

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  if (!shouldRenderMobileNavigation(pathname)) return null;
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  return (
    <nav
      className={`mobile-bottom-nav${isDashboard ? " mobile-bottom-nav--dashboard" : ""}`}
      aria-label={isDashboard ? "Member dashboard navigation" : "Mobile primary navigation"}
    >
      <ul>
        {isDashboard
          ? DASHBOARD_TABS.map((tab) => {
              const Icon = tab.Icon;
              const current = dashboardNavigationCurrentState(pathname, hash, tab.key);
              return (
                <li key={tab.key}>
                  <Link className="mobile-bottom-nav__link" href={tab.href} aria-current={current}>
                    <span className="mobile-bottom-nav__icon" aria-hidden="true"><Icon size={20} /></span>
                    <span className="mobile-bottom-nav__label">{tab.label}</span>
                  </Link>
                </li>
              );
            })
          : PUBLIC_TABS.map((tab) => {
              const Icon = tab.Icon;
              const current = mobileNavigationCurrentState(pathname, tab.key);
              return (
                <li key={tab.key}>
                  <Link className="mobile-bottom-nav__link" href={tab.href} aria-current={current}>
                    <span className="mobile-bottom-nav__icon" aria-hidden="true"><Icon size={20} /></span>
                    <span className="mobile-bottom-nav__label">{tab.label}</span>
                  </Link>
                </li>
              );
            })}
      </ul>
    </nav>
  );
}
