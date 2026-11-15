# EPE-LAWA consolidated News, navigation and Admin follow-up

**Updated:** 2026-11-15 11:37 WAT | **Branch:** `feat/consolidated-news-navbar-admin-20261115`

## Done

- Production’s already-merged `news_cover_urls_20261115` migration is present in the migration ledger. Read-only checks found no existing non-null `cover_url` values in published or versioned articles; this feature preserves article content, credits and versions.
- Read-only browser verification of the current Production baseline: `/news` returns 200 and, after hydration, shows the two published story links. Both approved story routes return 200 with matching titles/body content and no client page errors. This confirms baseline data loading, not the unreleased navbar.
- The new code keeps the News cover image URL editor, validates image URLs against exact HTTPS image-provider hosts, keeps source/license URLs as separate safe HTTPS links, and preserves full-frame cover rendering. Lead images are eager/high-priority; offscreen cards remain lazy.
- The public reference navbar is global, forest green, direct-link based and has no hamburger or drawer overlay. Secondary links, the protected Member dashboard link and theme switch are in a native More disclosure.
- The Admin dashboard shows only four capability-gated live queue counts, explicit “Unavailable” states when a count cannot be verified, and existing same-tab actions. No sample metrics, fake feed or private record details were added.
- Chrome Modern Web Guidance notes are updated for this shared navigation and dashboard scope.
- Local gates: Node 22.23.4 / pnpm 10.34.9; typecheck and both builds pass; 277 tests pass, 1 existing test is skipped.

## Pending

- Deploy a Vercel Preview for the PR, verify the new navbar/News UI and Admin dashboard against Production-backed data, and use the staff session without changing records.
- Capture genuine preview screenshots with the real EPE-LAWA logo and real database counts: navbar and News on desktop/mobile, plus Admin dashboard desktop/mobile. Add them to the PR and deliver the key views in chat; no new screenshots have been committed yet.
- After merge, apply the new forward-only `20261115113000_news_cover_image_host_allowlist` migration, then verify the Production deployment and live News pages. Do not alter the already-applied `20261115093000_news_cover_urls.sql` migration.

## Blocked / unavailable

- Direct image upload is unavailable because Production has no configured Supabase Storage bucket; external URL and approved-catalog options are the only supported cover paths.
- Newsletter and advertising intake remain non-collecting: `RESEND_API_KEY` is empty and there is no configured secure intake/delivery route. No test submission or email was faked.
- The separate handoff PR #100 is open and mergeable, but the GitHub connector receives 403 on status/check-run APIs; do not bypass or infer checks from that response.

## Resume point

Open the focused PR, wait for its Vercel Preview, run read-only News/Admin browser checks with real Production data, capture and commit screenshots, update this handoff with the exact preview/Production result, and merge only after required checks are verified healthy. Apply the new host-policy migration after merge; verify the live deployment before claiming release.

**Guidance source:** [Google Chrome Modern Web Guidance](https://github.com/googlechrome/modern-web-guidance). See [`2026-11-15-modern-web-guidance-notes.md`](./2026-11-15-modern-web-guidance-notes.md).
