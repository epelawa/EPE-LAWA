export type NavItem = {
  label: string;
  href: string;
  external?: boolean;
  hint?: string;
  primary?: boolean;
};

const sectionPages = [
  { label: "Home", href: "/", hint: "Latest stories" },
  { label: "Politics", href: "/politics", hint: "Epe Division politics and governance" },
  { label: "Sports", href: "/sports", hint: "Local sport and community games" },
  { label: "Culture", href: "/culture", hint: "Epe culture, festivals and heritage" },
  { label: "Education", href: "/education", hint: "Schools, learning and youth" },
  { label: "Business", href: "/business", hint: "Local business and trade" },
  { label: "Community", href: "/community", hint: "Community voices and notices" },
];

export function mainNavigation(): NavItem[] {
  return sectionPages;
}

export function primaryNavigation(items: NavItem[]): NavItem[] {
  return items.filter((item) => item.primary);
}

export const footerNavigation = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export const upcomingSections = [
  { label: "Who is Who", detail: "Sources and review in progress" },
  { label: "Forum", detail: "Opens with member accounts" },
];
