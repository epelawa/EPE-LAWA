# EPE-LAWA News redesign and cover media — handoff

**Checkpoint:** 2026-11-15, 10:26 WAT. Local validation is complete; this branch has not yet been opened or merged as a PR. It is based on `2484ec0e1ff66e13f141fc48d8adebc042650865` (`origin/main`, PR #98 merge). Refresh GitHub, Supabase and Vercel before release actions.

## What changed

The News page now uses one stable, responsive, reference-inspired composition. Its News-specific timer, selector and rotating-layout code are removed; the published-only article query, active-category navigation, search and bounded pagination remain. The work also adds a visible EPE-LAWA masthead for editorial routes, a forest-green News footer and a public `/advertise` information page. It uses the real brand artwork and existing routes, not sample headlines, fabricated audience numbers or unverified contact details.

An email signup shell is deliberately unavailable and non-collecting because Production email delivery is not configured. The Advertise page likewise does not claim an inquiry was sent or stored.

Authorized Admin editors can provide a public HTTPS cover URL with alt text, image credit, source and license, with server-side validation and a safe preview. Existing approved cover keys and credits remain intact. Public cover URLs use `no-referrer`; an external image host can still see a visitor’s IP address. Direct upload is not offered as working: Production has no image-storage bucket. The added URL metadata is version-aware and the migration leaves existing article bodies, image keys, credits and prior versions untouched. The News lead and first three visible cards are eager; the article hero is eager/high-priority inside a responsive 16:9 frame and uses `object-fit: cover`. Offscreen story cards remain lazy.

## Validation and screenshots

On the pinned Node 22 / pnpm 10.34.9 toolchain, the whole-workspace typecheck passed all 5 tasks, both optimized app builds passed (2/2), and the full suite completed with **272 tests: 271 passed, 0 failed, 1 existing documented skip**. Focused News, Admin cover, migration, theme and route checks also passed.

A localhost-only Playwright run used mocked PostgREST responses and synthetic stories. It found no horizontal overflow on either the News feed or article page at 320, 375, 390, 430, 768, 1024 or 1440 pixels. At mobile and desktop widths, lead/article images loaded eagerly, used `object-fit: cover` and carried `no-referrer`. The Advertise route was also checked at mobile and desktop: its enquiry state is truthful and its newsletter input and button stay disabled. Admin checks rejected an HTTP localhost URL, reported a broken image preview, required attribution fields, loaded a valid HTTPS preview and sent no `Referer` header. The temporary preview route had no save action and was removed after testing.

Screenshots are synthetic/local—not Production articles: [mobile News feed](../screenshots/news-reference/2026-11-15/news-feed-mobile.png), [desktop News feed](../screenshots/news-reference/2026-11-15/news-feed-desktop.png), [mobile article](../screenshots/news-reference/2026-11-15/news-article-mobile.png), [desktop article](../screenshots/news-reference/2026-11-15/news-article-desktop.png), [mobile Advertise page](../screenshots/news-reference/2026-11-15/advertise-mobile.png), [desktop Advertise page](../screenshots/news-reference/2026-11-15/advertise-desktop.png), and [Admin cover-link editor](../screenshots/news-reference/2026-11-15/admin-cover-link-editor.png).

## Production constraints and safety

A read-only Production Storage query on 2026-11-15 returned no buckets, so direct file upload remains blocked until the owner configures a bucket and secure access policies. The last read-only migration-ledger check did not contain `20261115093000_news_cover_urls`; the migration has not been applied. Before release, recheck exact schema prerequisites, function signatures, grants, view shape and ledger. After merge, apply only the reviewed forward-only migration and read back its ledger entry, view and ACLs.

Production `RESEND_API_KEY` was present but empty at the last metadata check. Newsletter signup and ad inquiries therefore remain non-collecting and unsent. No Production article, body, image key, credit, version history, member, role or capability was changed for this branch. Do not create a test story or alter an owner-approved story to exercise a save path.

## Status and resume point

**Done:** reference-led News UI, static layout, responsive full-bleed/eager covers, URL cover editor and safe validation, truthful provider states, synthetic mobile/desktop evidence, pinned typecheck/build/full-suite gates.

**Pending:** open one focused News PR from `feat/news-reference-newsletter-advertise-20261115`; wait for healthy hosted checks and a READY preview; merge normally; verify the exact Production deployment SHA. Then repeat the live migration preflight, apply the approved additive migration, read back schema/ACL/ledger results, smoke-test `/news` and a published article read-only, and compare article/version fingerprints. Do not claim EPE-LAWA is fully production-complete: Forum, History, Business/Map, Tourism, Who-is-Who, Radio programming and additional moderation workflows remain on the broader roadmap.

**Blocked:** direct uploads (no Production Storage bucket); newsletter and advertising email intake (email provider delivery and secure intake are unconfigured).

**Next, only after this News PR is merged and verified:** start the separate Admin workspace redesign from the then-current `main`, using the owner-provided Admin reference. Audit current features first; preserve every essential Admin action and server-side authorization; show only verified data and honest empty/unavailable states; do not invent metrics or assign roles. Capture desktop/mobile screenshots and record retained controls, missing/blocked reference features and exact checks in that PR’s handoff. Keep it out of the News PR.
