export type SiteLanguage = "en" | "yo";
export const SITE_LANG_COOKIE = "ep_lang";

type Strings = Record<string, string>;

const en: Strings = {
  "footer.tagline": "Rooted in Epe. Connected everywhere.",
  "footer.quickLinks": "Quick Links",
  "footer.browseTopics": "Browse topics",
  "footer.newsletter": "Subscribe to our newsletter",
  "footer.newsletterNote": "Stories and updates from Epe, straight to your inbox.",
  "footer.photoCredits": "Photo credits",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "switch.language": "Switch to Yoruba",

  "nav:/news": "News",
  "nav:/itan-ilu-mi": "Ìtàn Ilú Mi",
  "nav:/forum": "Forum",
  "nav:/map": "Map",
  "nav:/business-directory": "Business",
  "nav:/tourism": "Tourism",
  "nav:/radio": "Radio",
  "nav:/who-is-who": "Who is Who",
  "nav:/about": "About",
  "nav:/contact": "Contact",
  "nav:/advertise": "Advertise",
  "nav:/events": "Events",
  "nav:/newsletter": "Newsletter",
  "nav:/support": "Support",
  "nav:group:community": "Community",
  "nav:group:discover": "Discover",
  "nav:group:about": "About",
  "nav:full:/map": "Map & Navigation",
  "nav:full:/business-directory": "Business Directory",

  "home.eyebrow": "EPE DIVISION",
  "home.title.line1": "Stay Connected,",
  "home.title.line2": "Stay Informed",
  "home.lede": "News, history, places, businesses and community voices from across Epe Division.",
  "home.cta.news": "Read latest news",
  "home.cta.history": "Explore community history",
  "home.radio.eyebrow": "EPE LAWA RADIO",
  "home.radio.subtitle": "Listen to the station and explore our programmes.",
  "home.radio.cta": "Listen to radio",
  "home.shortcut.news": "Latest news",
  "home.shortcut.radio": "Listen to radio",
  "home.shortcut.history": "Community history",
  "home.shortcut.forum": "Join the conversation",
  "home.shortcut.business": "Local businesses",
  "home.shortcut.events": "Community events",
  "home.shortcut.places": "Places to visit",
  "home.shortcut.map": "Find your way",
  "home.shortcut.advertise": "Advertise with us",
  "home.news.title": "Latest News",
  "home.news.viewAll": "View all news",
  "home.story.read": "Read story",
  "home.engagement.read": "min read",
  "home.engagement.views": "views",
  "home.engagement.comments": "comments",
  "home.byline.unavailable": "Byline unavailable",
  "home.community.eyebrow": "OUR PLACE. OUR VOICES.",
  "home.community.title1": "Good things begin with",
  "home.community.emphasis": "connection.",
  "home.community.body": "Join conversations and share community knowledge through the features available on EPE LAWA.",
  "home.community.cta": "Create an account",
  "home.community.guidelines": "Read the community guidelines",
  "home.community.contributeLabel": "Ways to contribute",
  "home.community.shareHistory": "Share a local history",
  "home.community.listBusiness": "List your business",
  "home.empty.title": "No stories published yet",
  "home.empty.body": "New reporting will appear here when it is published.",
  "home.empty.cta": "Visit the newsroom",
};

const yo: Strings = {
  "footer.tagline": "Gbajúmò ìlú Epe. Tí a so mọ́ gbogbo ayé.",
  "footer.quickLinks": "Àwọn ìjápò kíákíá",
  "footer.browseTopics": "Yé wó àwọn àkótă",
  "footer.newsletter": "Forukosilé sí ìwé-ìròyìn wa",
  "footer.newsletterNote": "Ìròyìn àti àwọn ohun tuntun láti Epe, tààrà sí àpótè ìmélì rẹ.",
  "footer.photoCredits": "Ọlá fún àwọn oníṣé òwò àwòrán",
  "footer.privacy": "Àṣírí",
  "footer.terms": "Àwọn òfin",
  "switch.language": "Kí a máa sọ̀rọ̀ ní Gẹ̀ésì",

  "nav:/news": "Ìròyìn",
  "nav:/itan-ilu-mi": "Ìtàn Ilú Mi",
  "nav:/forum": "Fọ́rọ́mù",
  "nav:/map": "Máàpù",
  "nav:/business-directory": "Ìṣẹ̀ òwò",
  "nav:/tourism": "Ìrìnkérindò",
  "nav:/radio": "Rédíò",
  "nav:/who-is-who": "Àwọn Ènìyàn",
  "nav:/about": "Nípa wa",
  "nav:/contact": "Kan sí wa",
  "nav:/advertise": "Ìpolówó",
  "nav:/events": "Àwọn ìṣẹ̀lẹ̀",
  "nav:/newsletter": "Ìwé ìròyìn",
  "nav:/support": "Ìrànlọ́wọ́",
  "nav:group:community": "Àwùjọ",
  "nav:group:discover": "Àwárí",
  "nav:group:about": "Nípa wa",
  "nav:full:/map": "Máàpù & Ìtọ́sọ́nà",
  "nav:full:/business-directory": "Àwọn Ìṣẹ̀ òwò",

  "home.eyebrow": "EPE DIVISION",
  "home.title.line1": "Gbé ní ìjápọ̀,",
  "home.title.line2": "mọ ohun tó ń ṣẹlẹ̀",
  "home.lede": "Ìròyìn, ìtàn, ìrìnkérindò, ìṣẹ̀ òwò àti ohùn àwùjọ láti gbogbo Ẹpẹ́.",
  "home.cta.news": "Ka ìròyìn tuntun",
  "home.cta.history": "Ṣàwárí ìtàn ìlú wa",
  "home.radio.eyebrow": "EPE LAWA RADIO",
  "home.radio.subtitle": "Gbọ́ rédíò náà, kiri àwọn ètò wa.",
  "home.radio.cta": "Gbọ́ rédíò",
  "home.shortcut.news": "Ìròyìn tuntun",
  "home.shortcut.radio": "Gbọ́ rédíò",
  "home.shortcut.history": "Ìtàn ìlú wa",
  "home.shortcut.forum": "Wọ inú ìjírórò",
  "home.shortcut.business": "Ìṣẹ̀ òwò ìbílẹ̀",
  "home.shortcut.events": "Àwọn ìṣẹ̀lẹ̀ àwùjọ",
  "home.shortcut.places": "Ìrìnkérindò",
  "home.shortcut.map": "Máàpù",
  "home.shortcut.advertise": "Polówó lódọ̀ wa",
  "home.news.title": "Ìròyìn tuntun",
  "home.news.viewAll": "Wo gbogbo ìròyìn",
  "home.story.read": "Ka ìtàn yìí",
  "home.engagement.read": "ìṣẹ́jú kíkà",
  "home.engagement.views": "ìwò",
  "home.engagement.comments": "ọ̀rọ̀",
  "home.byline.unavailable": "Orúkọ oníròyìn kọ̀",
  "home.community.eyebrow": "ÌBÚDÓ WA. Ọ̀RỌ̀ WA.",
  "home.community.title1": "Ọ̀nà rere bẹ̀rẹ̀ ní",
  "home.community.emphasis": "ìjápọ̀.",
  "home.community.body": "Wọ inú ìjírórò, sì pín ìmọ̀ pẹ̀lú àwùjọ Ẹpẹ́ nípasẹ̀ àwọn ohun èlò tí ó wà ní EPE LAWA.",
  "home.community.cta": "Ṣẹ̀dá àkántì",
  "home.community.guidelines": "Ka àwọn òfin àwùjọ",
  "home.community.contributeLabel": "Ọ̀nà láti kópa",
  "home.community.shareHistory": "Pín ìtàn ìlú rẹ",
  "home.community.listBusiness": "Fi ìṣẹ̀ òwò rẹ sílẹ̀",
  "home.empty.title": "Kò sí ìròyìn tí a tí fi sílẹ̀",
  "home.empty.body": "Ìròyìn tuntun yóò hàn níbí nígbà tí a bá ti fi sílẹ̀.",
  "home.empty.cta": "Wọ ilé ìròyìn",
};

const dictionaries: Record<SiteLanguage, Strings> = { en, yo };

export function isSiteLanguage(value: unknown): value is SiteLanguage {
  return value === "en" || value === "yo";
}

export function t(lang: SiteLanguage, key: string): string {
  return dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
}

export function tt(lang: SiteLanguage, key: string, fallback: string): string {
  const value = dictionaries[lang][key] ?? dictionaries.en[key];
  return value ?? fallback;
}

const hrefKey = (href: string) => `nav:${href}`;
const groupKey = (label: string) => `nav:group:${label.toLowerCase()}`;

export function navLabel(lang: SiteLanguage, href: string, fallback: string): string {
  if (lang === "en") return fallback;
  return tt(lang, hrefKey(href), fallback);
}

export function navGroupLabel(lang: SiteLanguage, label: string): string {
  if (lang === "en") return label;
  return tt(lang, groupKey(label), label);
}

export function fullNavLabel(lang: SiteLanguage, href: string, fallback: string): string {
  if (lang === "en") return fallback;
  return tt(lang, `nav:full:${href}`, fallback);
}
