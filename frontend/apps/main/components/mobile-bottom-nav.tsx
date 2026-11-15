"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileNavigationCurrentState, shouldRenderMobileNavigation } from "../lib/navigation";
import type { MobileNavigationKey } from "../lib/navigation";
import { CompassIcon, HomeIcon, NewsTabIcon, UserIcon } from "./icons";

type Tab = {
  key: MobileNavigationKey;
  href: string;
  label: string;
  Icon: typeof HomeIcon;
};

const TABS: Tab[] = [
  { key: "home", href: "/", label: "Home", Icon: HomeIcon },
  { key: "news", href: "/news", label: "News", Icon: NewsTabIcon },
  { key: "discover", href: "/tourism", label: "Discover", Icon: CompassIcon },
  { key: "account", href: "/dashboard", label: "Account", Icon: UserIcon },
];

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  if (!shouldRenderMobileNavigation(pathname)) return null;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
      <ul>
        {TABS.map((tab) => {
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
