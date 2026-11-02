/**
 * Site chrome links. Only routes that exist and render real content belong here.
 *
 * Who is Who, Radio, Forum, Businesses and Shop are planned (docs/03-sitemap.md §2) but
 * have no page yet, so they are not in this list and not in the header. A nav item that
 * leads to a 404, or to a page that only says "coming soon", is worse than no nav item.
 */

export type NavItem = {
  label: string;
  href: string;
  /** True when the destination is another host, so the app renders a plain anchor. */
  external?: boolean;
};

const sectionPages: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Guidelines", href: "/guidelines" },
  { label: "Contact", href: "/contact" },
];

/** Header navigation. `newsUrl` is the publication host, or null when it is not configured. */
export function mainNavigation(newsUrl: string | null): NavItem[] {
  if (!newsUrl) return sectionPages;
  return [{ label: "News", href: newsUrl, external: true }, ...sectionPages];
}

export const footerNavigation: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Guidelines", href: "/guidelines" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];
