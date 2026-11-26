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

import { cookies } from "next/headers";
import { SITE_LANG_COOKIE, isSiteLanguage } from "./i18n-messages";

/**
 * The visitor's chosen language from the `ep_lang` cookie (default English).
 * Server-rendered chrome uses t(); every other UI string is translated in the
 * browser by <YorubaTranslator> from the dictionary in lib/yo/.
 */
export async function readSiteLanguage(): Promise<SiteLanguage> {
  try {
    const value = (await cookies()).get(SITE_LANG_COOKIE)?.value;
    return isSiteLanguage(value) ? value : "en";
  } catch {
    return "en";
  }
}
