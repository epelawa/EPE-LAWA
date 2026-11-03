export type NavItem = {
  label: string;
  href: string;
  hint?: string;
  primary?: boolean;
  external?: boolean;
};

const sectionPages = [
  { label: "Dashboard", href: "/", hint: "Real counts and queues" },
  { label: "Newsroom", href: "/newsroom", hint: "All articles" },

  { label: "People", href: "/people", hint: "Who is Who records" },
  { label: "Radio", href: "/radio", hint: "Stream config and schedule" },
  { label: "Businesses", href: "/businesses", hint: "Submissions and verification" },
  { label: "Orders", href: "/shop/orders", hint: "Order queue" },
  { label: "Staff", href: "/staff", hint: "Capability grants" },
  { label: "Audit", href: "/audit", hint: "Audit log" },
];

export function mainNavigation(): NavItem[] {
  return sectionPages;
}

export function primaryNavigation(items: NavItem[]): NavItem[] {
  return items.filter((item) => item.primary);
}

export const upcomingSections = [
  { label: "Who is Who", detail: "Sources and review in progress" },
  { label: "Forum", detail: "Opens with member accounts" },
];

export const footerNavigation = [
  { label: "Dashboard", href: "/" },
  { label: "Newsroom", href: "/newsroom" },
  { label: "People", href: "/people" },
  { label: "Radio", href: "/radio" },
];
