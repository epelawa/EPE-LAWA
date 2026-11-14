# Admin Newsroom mobile overflow — 2026-11-15 00:46 WAT

## Done

Scoped Newsroom table styles contain horizontal scrolling in a named, keyboard-focusable region. A positioned scroll container also contains the absolutely positioned screen-reader heading, which actual browser measurements identified as the remaining page-overflow source. Long titles/slugs wrap, while status, date and action labels stay intact. No schema, Auth, server actions or Production data changed.

## Verification

Pinned Node 22.23.5 / pnpm 10.34.9 dependencies were installed in the isolated `/workspace/EPE-LAWA-admin-mobile-overflow` worktree. Forced workspace typecheck/build passed 7/7 combined tasks; the Admin app was rebuilt after final CSS. Full local suite passed 237 total: 236 passed, 0 failed, 1 documented PGlite skip. Source regression includes the positioned-container guard.

Actual Chromium captures use synthetic-only Auth/REST fixtures at loopback HTTPS ports. No real identity or content was used; external browser requests were blocked. At widths 320, 390, 430, 768 and 1440px, both document and body widths equal the viewport. The article table scrolls inside its panel on small screens; off-screen table cells are intentional, not page overflow. Screenshots and measurements: `docs/screenshots/admin-newsroom-mobile/2026-11-15/`.

## Remaining / blocked / resume

This checkpoint precedes PR/merge/deployment. Sync with the latest merged main, rerun exact combined gates, commit this focused UI fix, merge normally and verify Production. No whole-site completion or real-data workflow pass is claimed. Browser fixture services were stopped after capture. No manual owner action is needed for this UI fix. Release work is a few local gates plus deployment verification, not a promised clock-time deadline.

## Combined-main verification — 2026-11-15 00:53 WAT

Synced with merged PR #83 main `6503b3a`. Sequential forced builds (2/2), typechecks (5/5) and full suite (239 total: 238 passed, 0 failed, 1 documented skip) passed on pinned toolchain. An earlier simultaneous build/typecheck attempt raced over generated Next types; sequential execution passed.
