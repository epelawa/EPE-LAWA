# News and member refresh — work in progress

This records the current local work, not a release or provider-readiness claim.

## Direction and implemented slice

The supplied references depict (1) a breaking-news/recommendations feed with Discover, (2) a rounded article cover and saved confirmation, (3) a second copy of the first reference, (4) a compact news feed and topic selector, (5) grouped profile settings, (6) a newsletter form, (7) a breaking-news/article layout, (8) a news/category list, (9) the existing radio banner and (10) the existing shortcut grid. They are visual references, not a source of article facts, identities, brand assets, or verified provider status.

This slice adds four presentation variations to member and article surfaces, a profile identity card, a real radio-style shortcut icon, rounded article imagery, and homepage engagement values when the published aggregate is available. The existing news article already reads engagement and estimated reading time. Content and server-side permissions do not depend on the selected presentation. News photo attribution has been consolidated on `/photo-credits#news-photos`, linked from the illustrative image. These are **inspired variations, not pixel-identical implementations** of every supplied image.

## Audit findings and remaining gates

- A source scan found deliberate unavailable states: newsletter, contact intake and advertising enquiries; History corrections and private media intake; and payments. These cannot be treated as functional merely by enabling a form. Provider configuration, privacy/consent, abuse controls, isolated end-to-end verification and operational ownership remain required.
- Public data pages depend on Supabase configuration, current schema and approved records. The local synthetic browser fixture does not establish live production availability or prove every public workflow.
- The full reference redesign, exact four layouts, all public-page verification, the requested site-wide background, and a complete review of all project documentation remain open. The external GetQuant page was read for general structure only; its visual background was not verified and no assets were copied.
- Article counts must remain sourced from real aggregate data; missing metrics must never become fabricated zeroes. Photographs retain source, author and license information in the linked credits page.
- No production writes, provider changes or newsletter subscriptions were performed.

## Local evidence

Typecheck, builds and existing automated tests were run on this work in progress; the browser smoke suite ran against synthetic local data. Exact final-tree checks, full route and authenticated staff testing and provider checks are still required before the complete request can be declared done or a release PR opened.

## Continuation verification

- The aggregate migration in `backend/supabase/migrations/20261116120000_article_engagement.sql` defines `read_minutes`, so the homepage projection matches the checked-in schema. This is not a live provider check.
- After the final CSS additions, the dashboard and light-refresh browser smoke specs passed (9 tests) against local synthetic fixtures. The full 28-test browser suite was run before those additions.
- The current variation choices are independently selected per area, not yet coordinated between article and member visits; the styles are restrained treatments rather than four distinct complete layouts. This remains unfinished.

## 2026-11-16 continuation

- Article and member treatments now share a per-tab pair: the first visit to the other surface uses the same variant; revisiting an already-seen surface selects a new pair. When session storage is unavailable, selection is independent. The four treatments are **Classic feed**, **Image-first**, **Split briefing**, and **Centered editorial**. They are CSS compositions on the existing accessible content, not four independently rebuilt applications; tab navigation can also start a new pair.
- A 19-route public smoke audit at 320 and 1440px verifies successful responses, headings and overflow against a synthetic Supabase stub; it is not a complete workflow audit. It exposed an uncontrolled history search field that was accidentally read-only; the field now accepts search text and has a regression test.
- Read-only production schema inspection confirmed the published engagement view includes `article_id`, `view_count`, `comment_count` and `read_minutes`. It does not confirm public permissions, live counts or end-to-end engagement writes.
- Typecheck and build passed. Tests passed on a serial rerun: 304 Node tests passed, one skipped; 20 Vitest tests passed. A concurrent build/test run had an admin noindex test failure, which passed when rerun after the build. All 32 browser smoke tests passed on synthetic fixtures; the strengthened 19-route audit (requiring HTTP 200) subsequently passed all four cases. Fixture read failures on other data surfaces were reported as unavailable rather than validated populated workflows.
- Newsletter, contact, advertising, private correction/media intake and payments remain unavailable until their provider, privacy, operational and isolated verification gates are satisfied. No production writes or provider configuration were performed.
- Further work remains before release: a full visual review against the supplied references and GetQuant's visual background, complete public and authenticated workflow testing at all required widths, real provider permission/end-to-end checks, and delivery setup for unavailable flows. The observed treatments are not a claim of full four-design reference parity. This change should remain draft until those gates are met.
