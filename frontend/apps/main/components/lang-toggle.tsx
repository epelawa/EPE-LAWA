import { SubmitButton } from "@epelawa/ui";
import { setSiteLanguage } from "../app/lang-actions";
import { readSiteLanguage, t } from "../lib/i18n";

export default async function LangToggle() {
  const lang = await readSiteLanguage();
  const next = lang === "yo" ? "en" : "yo";
  return <form action={setSiteLanguage}>
    <SubmitButton className="lang-toggle" lang={next} pendingLabel="Saving…">{t(lang, "switch.language")}</SubmitButton>
  </form>;
}
