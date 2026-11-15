export type NavItem = {
  label: string;
  href: string;
  hint?: string;
  primary?: boolean;
};

const items: NavItem[] = [
  { label: "News", href: "/news", hint: "Trending News", primary: true },
  { label: "Ìtàn Ilú Mi", href: "/itan-ilu-mi", hint: "My Community History", primary: true },
  { label: "Forum", href: "/forum", hint: "Chat Forum", primary: true },
  { label: "Map", href: "/map", hint: "Map & Navigation", primary: true },
  { label: "Business", href: "/business-directory", hint: "Business Directory & Marketplace", primary: true },
  { label: "Tourism", href: "/tourism", hint: "Historical Sites & Tourism" },
  { label: "Radio", href: "/radio", hint: "EPE LAWA Radio" },
  { label: "Who is Who", href: "/who-is-who", hint: "People and public office holders" },
  { label: "About", href: "/about", hint: "About EPE LAWA" },
  { label: "Contact", href: "/contact", hint: "Contact the team" },
  { label: "Advertise", href: "/advertise", hint: "Advertising information" },
];

export function mainNavigation(): NavItem[] {
  return items;
}

export function primaryNavigation(navItems: NavItem[]): NavItem[] {
  return navItems.filter((item) => item.primary);
}

export const footerNavigation: NavItem[] = [
  { label: "Trending News", href: "/news" },
  { label: "Ìtàn Ilú Mi — My Community History", href: "/itan-ilu-mi" },
  { label: "Chat Forum", href: "/forum" },
  { label: "Map & Navigation", href: "/map" },
  { label: "Epe Business Directory & Marketplace", href: "/business-directory" },
  { label: "Historical Sites & Tourism", href: "/tourism" },
  { label: "EPE LAWA Radio", href: "/radio" },
  { label: "Who is Who in Epe", href: "/who-is-who" },
  { label: "Advertise with EPE LAWA", href: "/advertise" },
];

export type MobileNavigationKey = "home" | "news" | "discover" | "account" | "saved" | "profile";
export type MobileNavigationCurrent = "page" | "location" | undefined;

const mobileNavigationHrefs: Record<MobileNavigationKey, string> = {
  home: "/",
  news: "/news",
  discover: "/tourism",
  account: "/dashboard",
  saved: "/dashboard?tab=saved",
  profile: "/dashboard?tab=profile",
};
const mobileDiscoverRoutes = ["/map", "/business-directory", "/tourism", "/radio"];
const mobileNavigationExcludedRoutes = ["/admin", "/auth", "/login", "/forgot-password", "/status"];

function routeMatches(pathname: string, route: string): boolean {
  return route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`);
}

function dashboardTab(search: string | URLSearchParams | undefined): string | undefined {
  if (!search) return undefined;
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return params.get("tab") ?? undefined;
}

export function mobileNavigationCurrentState(
  pathname: string,
  key: MobileNavigationKey,
  search?: string | URLSearchParams,
): MobileNavigationCurrent {
  if (pathname === "/dashboard") {
    const tab = dashboardTab(search);
    if (key === "home" && tab !== "discover" && tab !== "saved" && tab !== "profile") return "page";
    if (key === "discover" && tab === "discover") return "page";
    if (key === "saved" && tab === "saved") return "page";
    if (key === "profile" && tab === "profile") return "page";
    return undefined;
  }
  if (key === "home" && routeMatches(pathname, mobileNavigationHrefs.home)) return "page";
  if (key === "news" && routeMatches(pathname, mobileNavigationHrefs.news)) return "page";
  if (key === "account" && routeMatches(pathname, mobileNavigationHrefs.account)) return "page";
  if (key === "discover" && routeMatches(pathname, mobileNavigationHrefs.discover)) return "page";
  if (key === "discover" && mobileDiscoverRoutes.some((route) => routeMatches(pathname, route))) return "location";
  return undefined;
}

export function shouldRenderMobileNavigation(pathname: string): boolean {
  return pathname !== "/" && !mobileNavigationExcludedRoutes.some((route) => routeMatches(pathname, route));
}
