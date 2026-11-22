export type NavGroup = "Overview" | "Newsroom" | "Community" | "Trust" | "Inbox" | "Administration";

export type NavItem = {
  label: string;
  href: string;
  hint?: string;
  primary?: boolean;
  external?: boolean;
  /** Marked in the sidebar with a quiet badge; the destination page explains the plan. */
  comingSoon?: boolean;
  group?: NavGroup;
};

export type NavSection = {
  label: NavGroup;
  items: NavItem[];
};

const GROUP_ORDER: NavGroup[] = ["Overview", "Newsroom", "Community", "Trust", "Inbox", "Administration"];

const sectionPages: NavItem[] = [
  { label: "Dashboard", href: "/", hint: "Real counts and queues", primary: true, group: "Overview" },
  { label: "Newsroom", href: "/newsroom", hint: "Articles and editorial review", primary: true, group: "Newsroom" },
  { label: "History", href: "/itan-ilu-mi/review", hint: "Private contributions and reviewed publication", group: "Newsroom" },
  { label: "Radio", href: "/radio", hint: "Programmes, rights, episodes and schedule", primary: true, group: "Newsroom" },
  { label: "Corrections", href: "/corrections", hint: "Reader correction reports", group: "Newsroom" },
  { label: "Email digest", href: "/digest", hint: "Mail-ready weekly digest", group: "Newsroom" },
  { label: "Analytics", href: "/analytics", hint: "Reads, clicks and member trends", group: "Overview" },
  { label: "Site poll", href: "/poll", hint: "Compose the site-wide poll", group: "Newsroom" },
  { label: "Events queue", href: "/events", hint: "Community event submissions", group: "Community" },
  { label: "Song requests", href: "/radio/requests", hint: "Radio song request desk", group: "Community" },
  { label: "Appeals", href: "/appeals", hint: "Member appeals against moderation", group: "Trust" },
  { label: "Forum", href: "/moderation/forum", hint: "Reports, chats and message removal", primary: true, group: "Community" },
  { label: "Comments", href: "/moderation/comments", hint: "Edit and remove article comments", group: "Community" },
  { label: "Businesses", href: "/business-review", hint: "Submissions and verification", group: "Community" },
  { label: "Reviews", href: "/business-review/moderation", hint: "Business review moderation", group: "Community" },
  { label: "Tourism", href: "/tourism", hint: "Tourism submissions", group: "Community" },
  { label: "People", href: "/people", hint: "Who is Who records", group: "Community" },
  { label: "Ads", href: "/ads", hint: "Businesses shown in the public ad carousel", group: "Community" },
  { label: "Enquiries", href: "/enquiries", hint: "Restricted private messages and corrections", group: "Inbox" },
];

const staffPages: NavItem[] = [
  { label: "Members", href: "/members", hint: "Manage member accounts and messages", group: "Administration" },
  { label: "Staff users", href: "/users", hint: "Invite and manage staff accounts", group: "Administration" },
  { label: "Roles", href: "/roles", hint: "Configure staff roles and capabilities", group: "Administration" },
  { label: "Broadcast", href: "/broadcast", hint: "Notify verified members", group: "Administration" },
  { label: "Site pages", href: "/site-pages", hint: "Edit the About page and public page notes", group: "Administration" },
  { label: "Legal pages", href: "/legal-pages", hint: "Maintain the Privacy, Terms and Guidelines notes", group: "Administration" },
  { label: "Gallery & media", href: "/media", hint: "Public photo archive and media records", group: "Administration" },
  { label: "Backups", href: "/backups", hint: "Database backups and restore in R2", group: "Administration" },
  { label: "Settings", href: "/settings", hint: "Maintenance and workspace status", group: "Administration" },
  { label: "Cron Jobs", href: "/settings/cron", hint: "Cron job execution history and monitoring", group: "Administration" },
];

export function mainNavigation(): NavItem[] {
  return sectionPages;
}

export function staffNavigation(canManageStaff: boolean): NavItem[] {
  return canManageStaff ? [...sectionPages, ...staffPages] : sectionPages;
}

export function groupedNavigation(items: NavItem[]): NavSection[] {
  return GROUP_ORDER
    .map((label) => ({ label, items: items.filter((item) => item.group === label) }))
    .filter((section) => section.items.length > 0);
}

/** Pages every staff member can reach; used for the public-site link context. */
export function primaryNavigation(items: NavItem[]): NavItem[] {
  return items.filter((item) => item.primary);
}

export const footerNavigation = [
  { label: "Dashboard", href: "/" },
  { label: "Newsroom", href: "/newsroom" },
  { label: "Forum moderation", href: "/moderation/forum" },
  { label: "People", href: "/people" },
];
