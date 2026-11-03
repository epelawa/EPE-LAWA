export type NavItem = {
  label: string;
  href: string;
  external?: boolean;
  hint?: string;
  primary?: boolean;
};

const sectionPages: NavItem[] = [
  { label: "About", href: "/about", hint: "What EPE LAWA is" },
  { label: "Guidelines", href: "/guidelines", hint: "Community and editorial rules" },
  { label: "Contact", href: "/contact", hint: "Get in touch" },
];

/** Header navigation. News lives at /news/ on this host. */
export function mainNavigation(): NavItem[] {
  return [
    { label: "News", href: "/news", hint: "Publication", primary: true },
    ...sectionPages,
  ];
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

export const upcomingSections = [
  { label: "Who is Who", detail: "Sources in progress" },
  { label: "Forum", detail: "Opens with member accounts" },
  { label: "Businesses", detail: "Verified listings" },
];
