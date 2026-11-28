export type NavGroup = "OVERVIEW" | "MEDIA" | "PEOPLE & WORK" | "SYSTEM";

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

const GROUP_ORDER: NavGroup[] = ["OVERVIEW", "MEDIA", "PEOPLE & WORK", "SYSTEM"];

const overviewPages: NavItem[] = [
  { label: "Dashboard", href: "/", hint: "Real counts and queues", primary: true, group: "OVERVIEW" },
  { label: "Analytics", href: "/analytics", hint: "Reads, clicks and member trends", group: "OVERVIEW" },
];

const mediaPages: NavItem[] = [
  { label: "Media library", href: "/media", hint: "Public photo archive and media records", group: "MEDIA" },
  { label: "Radio", href: "/radio", hint: "Programmes, rights and schedule", primary: true, group: "MEDIA" },
];

const peopleAndWorkPages: NavItem[] = [
  { label: "Upload Article", href: "/newsroom/new", hint: "Create new article", primary: true, group: "PEOPLE & WORK" },
  { label: "Newsroom", href: "/newsroom", hint: "Articles and editorial review", primary: true, group: "PEOPLE & WORK" },
  { label: "History", href: "/itan-ilu-mi/review", hint: "Private contributions and reviewed publication", group: "PEOPLE & WORK" },
  { label: "Corrections", href: "/corrections", hint: "Reader correction reports", group: "PEOPLE & WORK" },
  { label: "People", href: "/people", hint: "Who is Who records", group: "PEOPLE & WORK" },
  { label: "Businesses", href: "/business-review", hint: "Submissions and verification", group: "PEOPLE & WORK" },
  { label: "Reviews", href: "/business-review/moderation", hint: "Business review moderation", group: "PEOPLE & WORK" },
  { label: "Tourism", href: "/tourism", hint: "Tourism submissions", group: "PEOPLE & WORK" },
  { label: "Map corrections", href: "/map-corrections", hint: "Privately review and verify map suggestions", group: "PEOPLE & WORK" },
  { label: "Events", href: "/events", hint: "Community event submissions", group: "PEOPLE & WORK" },
  { label: "Ads", href: "/ads", hint: "Businesses shown in the public ad carousel", group: "PEOPLE & WORK" },
];

const communityPages: NavItem[] = [
  { label: "Forum", href: "/moderation/forum", hint: "Reports, chats and message removal", primary: true, group: "PEOPLE & WORK" },
  { label: "Comments", href: "/moderation/comments", hint: "Edit and remove article comments", group: "PEOPLE & WORK" },
  { label: "Appeals", href: "/appeals", hint: "Member appeals against moderation", group: "PEOPLE & WORK" },
  { label: "Support tickets", href: "/support", hint: "Help requests: reply, assign and close; the AI answers simple ones", group: "PEOPLE & WORK" },
  { label: "Enquiries", href: "/enquiries", hint: "Restricted private messages and corrections", group: "SYSTEM" },
];

const systemPages: NavItem[] = [
  { label: "Members", href: "/members", hint: "Manage member accounts and messages", group: "SYSTEM" },
  { label: "Staff users", href: "/users", hint: "Invite and manage staff accounts", group: "SYSTEM" },
  { label: "Roles", href: "/roles", hint: "Configure staff roles and capabilities", group: "SYSTEM" },
  { label: "Broadcast", href: "/broadcast", hint: "Notify verified members", group: "SYSTEM" },
  { label: "Site pages", href: "/site-pages", hint: "Edit the About page and public page notes", group: "SYSTEM" },
  { label: "Legal pages", href: "/legal-pages", hint: "Maintain the Privacy, Terms and Guidelines notes", group: "SYSTEM" },
  { label: "Backups", href: "/backups", hint: "Database backups and restore in R2", group: "SYSTEM" },
  { label: "Storage", href: "/storage", hint: "Space used by the database and files; clean up and compress", group: "SYSTEM" },
  { label: "Settings", href: "/settings", hint: "Maintenance and workspace status", group: "SYSTEM" },
  { label: "Cron Jobs", href: "/settings/cron", hint: "Cron job execution history and monitoring", group: "SYSTEM" },
  { label: "AI Scheduler", href: "/ai-scheduler", hint: "Autopilot, schedule and what the AI may do", primary: true, group: "SYSTEM" },
  { label: "AI chat", href: "/ai-chat", hint: "Ask the AI to act on articles and support tickets", group: "SYSTEM" },
  { label: "AI processes", href: "/ai-processes", hint: "Everything the AI did, skipped or escalated", group: "SYSTEM" },
  { label: "Logs", href: "/logs", hint: "Admin sign-ins, actions, devices and locations", group: "SYSTEM" },
];

// Combine all pages in order
const allPages: NavItem[] = [
  ...overviewPages,
  ...mediaPages,
  ...peopleAndWorkPages,
  ...communityPages,
  ...systemPages,
];

export function mainNavigation(): NavItem[] {
  return allPages;
}

export function staffNavigation(canManageStaff: boolean): NavItem[] {
  // These two desks enforce the same server authorization check.
  return canManageStaff ? allPages : allPages.filter(({ href }) => href !== "/users" && href !== "/roles");
}

/**
 * Maps navigation items to required capabilities
 */
const itemCapabilities: Record<string, string[]> = {
  "/": [],
  "/analytics": ["audit.read"],
  "/newsroom": ["article.create", "article.review", "article.publish"],
  "/newsroom/new": ["article.create"],
  "/itan-ilu-mi/review": ["article.create"],
  "/radio": ["radio.manage"],
  "/corrections": ["article.review"],
  "/moderation/forum": ["moderation.review"],
  "/moderation/comments": ["moderation.review"],
  "/business-review": ["business.review"],
  "/business-review/moderation": ["business.review"],
  "/tourism": ["article.publish"],
  "/map-corrections": ["map.review"],
  "/events": ["events.review", "article.publish"],
  "/people": ["people.manage"],
  "/ads": ["article.publish"],
  "/appeals": ["moderation.review"],
  "/enquiries": ["moderation.review"],
  "/support": ["moderation.review"],
  "/members": ["staff.manage"],
  "/users": ["staff.manage"],
  "/roles": ["staff.roles.manage"],
  "/broadcast": ["staff.manage"],
  "/site-pages": ["staff.manage"],
  "/legal-pages": ["staff.manage"],
  "/media": ["staff.manage"],
  "/backups": ["staff.manage"],
  "/storage": ["staff.manage"],
  "/settings": ["staff.manage"],
  "/settings/cron": ["staff.manage"],
};

export function filterNavigationByCapabilities(
  items: NavItem[],
  capabilities: string[]
): NavItem[] {
  const hasAllCapabilities = capabilities.includes("admin.access");
  if (hasAllCapabilities) return items;
  return items.filter((item) => {
    const requiredCaps = itemCapabilities[item.href] || [];
    if (requiredCaps.length === 0) return true;
    return requiredCaps.some((cap) => capabilities.includes(cap));
  });
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
