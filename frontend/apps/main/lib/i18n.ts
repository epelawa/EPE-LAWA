import type { SiteLanguage } from "./i18n-messages";

export {
  SITE_LANG_COOKIE,
  isSiteLanguage,
  t,
  tt,
  navLabel,
  navGroupLabel,
  fullNavLabel,
} from "./i18n-messages";

export type { SiteLanguage } from "./i18n-messages";

// Full-site Yoruba translations are not yet available. Ignore the old partial
// language preference until the entire experience can be translated.
export async function readSiteLanguage(): Promise<SiteLanguage> {
  return "en";
}
