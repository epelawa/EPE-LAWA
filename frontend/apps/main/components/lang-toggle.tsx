import { setSiteLanguage } from "../app/lang-actions";
import { readSiteLanguage, t } from "../lib/i18n";

export default async function LangToggle() {
  const lang = await readSiteLanguage();
  const next = lang === "yo" ? "en" : "yo";
  return <form action={setSiteLanguage}>
    <button className="lang-toggle" type="submit" lang={next}>{t(lang, "switch.language")}</button>
  </form>;
}
