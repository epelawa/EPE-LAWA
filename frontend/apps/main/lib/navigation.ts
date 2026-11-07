export type NavItem = {
  label: string;
  href: string;
  hint?: string;
  /** Rendered in the header bar at 768px and up. Everything else is drawer-only. */
  primary?: boolean;
};

/**
 * Header navigation.
 *
 * Five destinations inline, two more in the drawer. Nothing here advertises a
 * section that does not exist: the previous list included "Forum" and
 * "Businesses — verified listings", which were not built.
 */
const headerItems: NavItem[] = [
  { label: "News", href: "/news", hint: "Reports and features", primary: true },
  { label: "Who is Who", href: "/who-is-who", hint: "People and public office", primary: true },
  { label: "Radio", href: "/radio", hint: "The programme on Radio Lagos", primary: true },
  { label: "About", href: "/about", hint: "What EPE LAWA is", primary: true },
  { label: "Contact", href: "/contact", hint: "Get in touch", primary: true },
];

const drawerOnlyItems: NavItem[] = [
  { label: "Guidelines", href: "/guidelines", hint: "Editorial and community rules" },
  { label: "Gallery", href: "/gallery", hint: "Photographs, licensed and credited" },
];

export function mainNavigation(): NavItem[] {
  return [...headerItems, ...drawerOnlyItems];
}

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
