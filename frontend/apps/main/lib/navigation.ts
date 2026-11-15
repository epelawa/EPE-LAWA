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

export type MobileNavigationKey = "home" | "news" | "discover" | "account";
export type MobileNavigationCurrent = "page" | "location" | undefined;
export type DashboardNavigationKey = "dashboardHome" | "dashboardDiscover" | "dashboardSaved" | "dashboardProfile";

const mobileNavigationHrefs: Record<MobileNavigationKey, string> = {
  home: "/",
  news: "/news",
  discover: "/tourism",
  account: "/dashboard",
};
const mobileDiscoverRoutes = ["/map", "/business-directory", "/tourism", "/radio"];
const mobileNavigationExcludedRoutes = ["/admin", "/auth", "/login", "/forgot-password", "/status"];

function routeMatches(pathname: string, route: string): boolean {
  return route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`);
}

export function mobileNavigationCurrentState(pathname: string, key: MobileNavigationKey): MobileNavigationCurrent {
  if (routeMatches(pathname, mobileNavigationHrefs[key])) return "page";
  if (key === "discover" && mobileDiscoverRoutes.some((route) => routeMatches(pathname, route))) return "location";
  return undefined;
}

const dashboardNavigationTargets: Record<DashboardNavigationKey, string> = {
  dashboardHome: "#home",
  dashboardDiscover: "#discover",
  dashboardSaved: "#saved",
  dashboardProfile: "#profile",
};

export function dashboardNavigationCurrentState(
  pathname: string,
  hash: string,
  key: DashboardNavigationKey,
): MobileNavigationCurrent {
  if (!routeMatches(pathname, "/dashboard")) return undefined;
  const currentHash = hash || "#home";
  return currentHash === dashboardNavigationTargets[key] ? "page" : undefined;
}

export function shouldRenderMobileNavigation(pathname: string): boolean {
  return pathname !== "/" && !mobileNavigationExcludedRoutes.some((route) => routeMatches(pathname, route));
}
