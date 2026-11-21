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
  { label: "History", href: "/itan-ilu-mi/review", hint: "Private contributions and reviewed publication" },
  { label: "Forum", href: "/moderation/forum", hint: "Reports and moderation queue", primary: true },
  { label: "Businesses", href: "/business-review", hint: "Submissions and verification" },
  { label: "Reviews", href: "/business-review/moderation", hint: "Business review moderation" },
  { label: "Orders", href: "/orders", hint: "Order queue" },
  { label: "Tourism", href: "/tourism", hint: "Tourism submissions" },
  { label: "Radio", href: "/radio", hint: "Programmes, rights, episodes and schedule", primary: true },
  { label: "People", href: "/people", hint: "Who is Who records" },
  { label: "Enquiries", href: "/enquiries", hint: "Restricted private messages and corrections" },
  { label: "Media", href: "/media", hint: "R2 media uploads and credits" },
];

export function mainNavigation(): NavItem[] {
  return sectionPages;
}

export function staffNavigation(canManageStaff: boolean): NavItem[] {
  return canManageStaff
    ? [...sectionPages,
      { label: "Settings", href: "/settings", hint: "Deployment configuration and setup" },
      { label: "Members", href: "/members", hint: "Manage member accounts and messages" },
      { label: "Broadcast", href: "/broadcast", hint: "Notify verified members" },
      { label: "Roles", href: "/roles", hint: "Configure staff roles and capabilities" },
      { label: "Staff users", href: "/users", hint: "Invite and manage staff accounts" },
      { label: "Backups", href: "/backups", hint: "Database backups and restore in R2" },
    ]
    : sectionPages;
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
