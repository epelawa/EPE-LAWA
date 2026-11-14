# News minute-rotation layout handoff — 2026-11-14 23:23 WAT

## Done

- Refined the News listing to a compact, mobile-first editorial layout with flat cards, a cloud-blue canvas, restrained ink-colored controls, and only the small EPE LAWA wordmark at the bottom of the News route.
- Kept the published-only feed, real categories, search and bounded pagination; no filters or stories were invented or added.
- Added a deterministic minute-bucket layout selector and five presentation variants. The selected presentation changes at minute boundaries without changing the underlying content.
- Corrected the desktop editorial-rail grid so the feature, category navigation and story list stay in the main column beside related stories, with a measured 14px gap after the feature.

## Validation evidence

- Node 22.23.5 / pnpm 10.34.9: focused News tests **13 passed, 0 failed**; public-app TypeScript check passed; `git diff --check` passed.
- Local-only Playwright used clearly synthetic demo articles from a loopback mock. All five widths rendered four fixture links with no page errors, no preparing overlay, and no horizontal overflow: 320, 390, 430, 768 and 1440 CSS px. Desktop editorial-rail feature-to-category gap: 14px. These are not Production articles and were never inserted into the live database.
- Screenshot evidence: [320px](assets/2026-11-14-news-minute/news-320.png), [390px](assets/2026-11-14-news-minute/news-390.png), [430px](assets/2026-11-14-news-minute/news-430.png), [768px](assets/2026-11-14-news-minute/news-768.png), [1440px](assets/2026-11-14-news-minute/news-1440.png). Each screenshot contains clearly marked synthetic demo copy.

## Pending

- Merge the focused News PR only through the ordinary GitHub merge command after refreshing its exact head and allowing GitHub’s normal gates to decide.
- Verify the corresponding Production deployment by exact commit after merge. The screenshots above are local only.
- The public News feed remains honestly empty until real, authorized editorial content is published through the Admin workflow.

## Blocked

- Hosted PR check details are unavailable to the current GitHub connector; do not claim hosted CI passed.
- No live articles are used in this candidate. Production content changes are handled separately through the audited, user-scoped Newsroom workflow.

## Resume point

1. Commit only the News source, tests, this handoff, roadmap/progress entries and the five screenshot artifacts.
2. Push normally, open one focused PR, refresh exact-head checks/deployment, then try an ordinary merge without bypass flags.
3. After any merge, verify `main` and its exact Production deployment before continuing with the separate Auth and Newsroom fixes.
