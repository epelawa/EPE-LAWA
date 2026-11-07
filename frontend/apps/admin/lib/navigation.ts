export type NavItem = {
  label: string;
  href: string;
  hint?: string;
  primary?: boolean;
  external?: boolean;
};

const sectionPages: NavItem[] = [
  { label: "Dashboard", href: "/", hint: "Real counts and queues", primary: true },
  { label: "Newsroom", href: "/newsroom", hint: "Articles and editorial review", primary: true },
  { label: "Who is Who review", href: "/itan-ilu-mi/review", hint: "Review profile submissions" },
  { label: "Forum moderation", href: "/moderation/forum", hint: "Reports and moderation queue", primary: true },
  { label: "Business review", href: "/business-review", hint: "Submissions and verification" },
  { label: "Orders", href: "/orders", hint: "Order queue" },
  { label: "Tourism", href: "/tourism", hint: "Tourism submissions" },
  { label: "Radio", href: "/radio", hint: "Stream config and schedule", primary: true },
  { label: "People", href: "/people", hint: "Who is Who records" },
];

export function mainNavigation(): NavItem[] {
  return sectionPages;
}

export function primaryNavigation(items: NavItem[]): NavItem[] {
  return items.filter((item) => item.primary);
}

export const footerNavigation = [
  { label: "Dashboard", href: "/" },
  { label: "Newsroom", href: "/newsroom" },
  { label: "Forum moderation", href: "/moderation/forum" },
  { label: "Orders", href: "/orders" },
  { label: "People", href: "/people" },
];
