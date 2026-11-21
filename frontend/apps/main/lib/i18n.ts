import { cookies } from "next/headers";

export type SiteLanguage = "en" | "yo";
export const SITE_LANG_COOKIE = "ep_lang";

type StarterStrings = Record<string, string>;

const en: StarterStrings = {
  "footer.tagline": "Rooted in Epe. Connected everywhere.",
  "footer.quickLinks": "Quick Links",
  "footer.browseTopics": "Browse topics",
  "footer.newsletter": "Subscribe to our newsletter",
  "footer.newsletterNote": "Stories and updates from Epe, straight to your inbox.",
  "footer.photoCredits": "Photo credits",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "switch.language": "Switch to Yoruba",
};

const yo: StarterStrings = {
  "footer.tagline": "Gbajúmò ìlú Epe. Tí a so mó gbogbo ayé.",
  "footer.quickLinks": "Àwọn ìjápò kíákíá",
  "footer.browseTopics": "Yé wó àwọn àkótă",
  "footer.newsletter": "Forukosilé sí ìwé-ìròyìn wa",
  "footer.newsletterNote": "Ìròyìn àti àwọn ohun tuntun láti Epe, tààrà sí àpótè ìmélì rè.",
  "footer.photoCredits": "Olá fún àwọn oníşé àwòrán",
  "footer.privacy": "Àşírí",
  "footer.terms": "Àwọn òfin",
  "switch.language": "Kí a máa sòrò ní Gèésì",
};

const dictionaries: Record<SiteLanguage, StarterStrings> = { en, yo };

export function isSiteLanguage(value: unknown): value is SiteLanguage {
  return value === "en" || value === "yo";
}

export async function readSiteLanguage(): Promise<SiteLanguage> {
  try {
    const value = (await cookies()).get(SITE_LANG_COOKIE)?.value;
    return isSiteLanguage(value) ? value : "en";
  } catch {
    return "en";
  }
}

export function t(lang: SiteLanguage, key: string): string {
  return dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
}
