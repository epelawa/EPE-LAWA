/**
 * Site chrome links. Only routes that exist and render real content belong here.
 *
 * Who is Who, Forum, Businesses and Shop are planned (docs/03-sitemap.md §2) but have no
 * page yet, so they are neither in the header nor in the drawer. A nav item that leads to a
 * 404, or to a page that only says "coming soon", is worse than no nav item.
 */

export type NavItem = {
  label: string;
  href: string;
  /** True when the destination is another host, so the app renders a plain anchor. */
  external?: boolean;
  /** One line shown under the label in the drawer. Keeps the drawer self-explanatory. */
  hint?: string;
  /** Shown inline in the desktop navigation bar as well as in the drawer. */
  primary?: boolean;
};

const sectionPages: NavItem[] = [
  { label: "Radio", href: "/radio", hint: "Radio Lagos 107.5 FM, live and on demand", primary: true },
  { label: "Gallery", href: "/gallery", hint: "Photographs from across Epe Division", primary: true },
  { label: "About", href: "/about", hint: "What EPE LAWA is and who runs it", primary: true },
  { label: "Guidelines", href: "/guidelines", hint: "How we source, correct and moderate" },
  { label: "Contact", href: "/contact", hint: "Reach the newsroom" },
];

/** Header navigation. `newsUrl` is the publication host, or null when it is not configured. */
export function mainNavigation(newsUrl: string | null): NavItem[] {
  const news: NavItem[] = newsUrl
    ? [{ label: "News", href: newsUrl, external: true, hint: "The publication", primary: true }]
    : [];
  return [...news, ...sectionPages];
}

/** The subset rendered inline in the bar. The drawer always shows everything. */
export function primaryNavigation(items: NavItem[]): NavItem[] {
  return items.filter((item) => item.primary);
}

export const footerNavigation: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Guidelines", href: "/guidelines" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

/** Shown in the drawer's utility block. These are honest states, not promises. */
export const upcomingSections = [
  { label: "Who is Who", detail: "Sources and review in progress" },
  { label: "Forum", detail: "Opens with member accounts" },
  { label: "Businesses", detail: "Open to verified listings" },
  { label: "Marketplace", detail: "Opens with payments" },
];
