import { cookies } from "next/headers";

import {
  SITE_LANG_COOKIE,
  isSiteLanguage,
  type SiteLanguage,
} from "./i18n-messages";

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

export async function readSiteLanguage(): Promise<SiteLanguage> {
  try {
    const value = (await cookies()).get(SITE_LANG_COOKIE)?.value;
    return isSiteLanguage(value) ? value : "en";
  } catch {
    return "en";
  }
}
