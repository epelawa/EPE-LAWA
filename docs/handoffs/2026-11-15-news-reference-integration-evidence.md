# EPE-LAWA News redesign — verified integration evidence

**Checkpoint:** 2026-11-15, during the separate reference-led News PR. This is a point-in-time pre-release record; refresh Production status before release.

## Design source

The owner supplied `/home/ubuntu/upload/JEhCP0oBVdcQV2Bl2ZHkCO/277641.png` as the design reference. It shows a white editorial news page, deep forest-green utility strip/footer, a large lead story with a headline rail, story cards, a newsletter panel, and a four-part footer. The sample headlines, story details, images, dates and audience claims are not source material. Implementation should use published EPE-LAWA articles, actual project brand artwork, and existing routes only. A public image search did not yield a verified project asset, so no search-result image is being used.

## Production email readiness

On 2026-11-15, the authorized read-only Vercel API lookup identified the EPE-LAWA project `epe-lawa` (`prj_iCr02kZMXVOclp2cww6KDPcdimPM`). The `RESEND_API_KEY` variable exists for the `production` target, but its value is empty. No message was sent. The project’s existing `/contact` page also explicitly states that email delivery and secure message storage are not connected. The repository integration notes require sender-domain authentication and a private end-to-end delivery test before claiming email is operational.

Until a provider is configured and tested, newsletter forms must not accept or store addresses, and advertising intake must not claim a message was sent or saved. Required manual provider setup should include a non-empty `RESEND_API_KEY`, a verified sender identity/domain with SPF/DKIM/DMARC, and a private advertising-recipient configuration if ad inquiries will be delivered by email. No private contact address should be displayed publicly.

## Production Storage and migration status

The active Supabase Production project is `EPE LAWA` (`igqmybuiovaxqmrteebd`, region `eu-west-3`). A read-only query of `storage.buckets` returned no rows on 2026-11-15 at 09:52; direct image upload must not be implied. The project’s migration ledger, queried at 09:53, did not contain `20261115093000_news_cover_urls`; its newest listed entry was `20261115003732`. The proposed cover-URL migration is additive and version-aware; re-check the ledger and exact prerequisites immediately before any application. No article rows or versions were modified during these checks.

## Current implementation boundary

The parked `fix/news-cover-url-20261115` worktree is preserved. Its compatible HTTPS URL-cover editor, validation, eager/full-container rendering and additive migration have been copied into the new clean-main redesign worktree for review and integration. Direct file upload remains unavailable because Production has no Storage bucket. Newsletter and ad email delivery remain blocked by the empty production Resend key and missing secure intake path; UI must state that plainly and never create a false success.
