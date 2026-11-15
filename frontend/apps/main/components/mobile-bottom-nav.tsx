"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { mobileNavigationCurrentState, shouldRenderMobileNavigation } from "../lib/navigation";
import type { MobileNavigationKey } from "../lib/navigation";
import { BookmarkIcon, CompassIcon, HomeIcon, NewspaperIcon, UserIcon } from "./icons";

type Tab = {
  key: MobileNavigationKey;
  href: string;
  label: string;
  Icon: typeof HomeIcon;
};

const PUBLIC_TABS: Tab[] = [
  { key: "home", href: "/", label: "Home", Icon: HomeIcon },
  { key: "news", href: "/news", label: "News", Icon: NewspaperIcon },
  { key: "discover", href: "/tourism", label: "Discover", Icon: CompassIcon },
  { key: "account", href: "/dashboard", label: "Account", Icon: UserIcon },
];

const DASHBOARD_TABS: Tab[] = [
  { key: "home", href: "/dashboard?tab=home", label: "Home", Icon: HomeIcon },
  { key: "discover", href: "/dashboard?tab=discover", label: "Discover", Icon: CompassIcon },
  { key: "saved", href: "/dashboard?tab=saved", label: "Saved", Icon: BookmarkIcon },
  { key: "profile", href: "/dashboard?tab=profile", label: "Profile", Icon: UserIcon },
];

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  if (!shouldRenderMobileNavigation(pathname)) return null;
  const tabs = pathname === "/dashboard" ? DASHBOARD_TABS : PUBLIC_TABS;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
      <ul>
        {tabs.map((tab) => {
          const Icon = tab.Icon;
          const current = mobileNavigationCurrentState(pathname, tab.key, searchParams);
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
