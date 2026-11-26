"use client";

import { setSiteLanguage } from "../app/lang-actions";
import { SITE_LANG_COOKIE, type SiteLanguage } from "../lib/i18n-messages";

/**
 * English / Yorùbá switch. With JavaScript the choice is stored in the
 * `ep_lang` cookie and the page reloads in the chosen language; without it the
 * server action stores the same cookie. Labels stay in their own language and
 * are excluded from translation so both are always recognisable.
 */
function store(next: SiteLanguage) {
  document.cookie = `${SITE_LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  window.location.reload();
}

export default function LanguageSwitch({ lang, className = "", buttonsOnly = false }: { lang: SiteLanguage; className?: string; buttonsOnly?: boolean }) {
  // Masthead variant: a plain button group (no <form>), so pages that must not render a form
  // (for example the contact availability page) stay form-free. The header and drawer both need
  // JavaScript already; the form variant (server action fallback) remains for no-JS placements.
  if (buttonsOnly) {
    return (
      <div role="group" className={`lang-switch ${className}`} translate="no" aria-label="Language / Èdè">
        <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => { if (lang !== "en") store("en"); }}>EN<span className="sr-only"> English</span></button>
        <button type="button" lang="yo" aria-pressed={lang === "yo"} onClick={() => { if (lang !== "yo") store("yo"); }}>YO<span className="sr-only"> Yorùbá</span></button>
      </div>
    );
  }
  function choose(event: React.FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const next = submitter?.value;
    if (next !== "en" && next !== "yo") return;
    event.preventDefault();
    if (next === lang) return;
    store(next);
  }
  return (
    <form action={setSiteLanguage} onSubmit={choose} className={`lang-switch ${className}`} translate="no" aria-label="Language / Èdè">
      <button type="submit" name="lang" value="en" lang="en" aria-pressed={lang === "en"}>EN<span className="sr-only"> English</span></button>
      <button type="submit" name="lang" value="yo" lang="yo" aria-pressed={lang === "yo"}>YO<span className="sr-only"> Yorùbá</span></button>
    </form>
  );
}
