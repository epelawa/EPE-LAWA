# Independent verification — 2026-11-21

Scope: full re-verification of the project without relying on `docs/EXECUTION-CHECKLIST.md` checkboxes, which were compiled 2026-11-20 against commit `49bf9d8` and are stale. Evidence below comes from the repository at `main` `e3e791f7787cd8992f71ab6df6e1ad2609081fc8` (PR #238), live HTTP reads of `https://epelawa.vercel.app` (read-only, no writes), local command runs, and the GitHub API. No production database, schema, or data was accessed or modified.

## How this was verified

- `gh` API: open/merged PRs, run history, branch protection (`branches/main` → `protected: false`).
- Live site: read-only HTTP fetches of every public module route, `/admin/login`, `/api/health`, `/sitemap.xml`.
- Local: fresh `pnpm install --frozen-lockfile` (clean), `pnpm typecheck` (exit 0, 5/5 tasks, 0 cached), `pnpm test` (362 tests: 357 pass, 4 fail, 1 skip — all 4 failures are `fetch failed` from tests that launch the built app over localhost, which this sandbox blocks; the same suite passed in CI `44934522791` on this exact head).
- Code inspection for each previously claimed gap: payments surfaces, `admin_member_delete` call sites, forum polls code, featured-story workflow, sponsor popup motion, orders UI.

## Things the stale docs got wrong (now corrected)

1. **README "Deployment status"** claimed the live alias is an older incomplete release with 404s and Radio overflow. False as of 2026-11-21: the live site serves all eight modules; News/homepage are populated with real published stories; Business Directory shows a verified business; admin login and health endpoint work. Corrected in README.
2. **`docs/14-tracker.md`** was last checked 2026-11-18 with a PR #154 baseline and "CI blocked by picomatch advisory" (already withdrawn). Updated with a dated 2026-11-21 verified snapshot at the top.
3. **`docs/12-development-roadmap.md` "Known status"** described `main` at `203d7ca` (PR #48 era) with an empty newsroom. That was ~190 PRs ago. Marked superseded and a verified 2026-11-21 status added.
4. **`docs/EXECUTION-CHECKLIST.md`**: its numbers (55 local migrations — now 76; PRs up to #196 — now #238; O1 Vercel blocker — now passing) are stale in both directions. A verification addendum was added at the top; the per-item checkboxes were NOT rewritten wholesale because each needs individual re-verification (that is the remaining documentation work).
5. Itan Ilu Mi's correction intake is no longer the old "Coming Soon" disclosure — the live page offers a working correction-request form that goes to a private staff queue. Old snapshots saying otherwise are stale.

## Live-site audit (verified 2026-11-21)

| Route | Result |
| --- | --- |
| `/` | 200 — breaking ticker, featured business (Founda Technologies), latest news with view/comment counts, radio card, ads, cookie notice |
| `/news` | 200 — 2 published real stories, featured story, breaking banner, search |
| `/itan-ilu-mi` | 200 — honest empty state, live correction-request form, contribution sign-in gate |
| `/forum` | **Defect** — renders the app error boundary ("Try once more, or take another route") instead of the listing; verified live. The page code handles read failures gracefully, so the thrown error originates elsewhere; needs live-DB access to identify |
| `/map` | 200 — OpenStreetMap embed, safe Google handoff wording |
| `/business-directory` | 200 — 1 verified business with logo, Call/WhatsApp CTAs, categories |
| `/tourism` | 200 — credited photo references, honest empty approved-destinations state |
| `/radio` | 200 — Radio Lagos 107.5 FM player, sponsor slot, programmes/reminders links |
| `/who-is-who` | 200 — honest empty state, community filters |
| `/gallery` | 200 — honest empty state |
| `/admin/login` | 200 noindex |
| `/api/health` | 200 — `{"status":"ok"}`, no environment detail (intentional) |

## Verified still-not-done (code + live + CI evidence)

1. **Forum live error boundary** (defect): investigate and fix; requires read-only live-DB access to diagnose (suspected missing production object the page touches).
2. **`admin_member_delete`**: still wired and callable from the admin UI (`frontend/apps/admin/app/(protected)/members/actions.ts:24`) while, per the 2026-11-20 inventory, the migration was never applied to the production ledger (audit-before-effect bug stands). Owner decision O3 still open.
3. **Production migration-ledger drift**: 76 local migration files; the best available live inventory is the 2026-11-20 read-only snapshot (48 local files then had no remote ledger entry). Since then, ALL migrations dated 2026-11-21/22 are unlikely to be applied and unverified: `20261121120000_maintenance_mode`, `20261121130000_site_maintenance_updated_at_trigger`, `20261121140000_media_administration`, `20261121210000_primary_administrator_accounts`, `20261121211500_newsroom_article_delete`, `20261121213000_remove_prefilled_covers_part1_rpcs`, `20261121213100_part2_column`, `20261121214500_newsroom_delete_version_guard`, `20261121220000_media_assets_alt_text`, `20261121230000_business_staff_create`, `20261121231000_people_corrections_staff_console`, `20261121232000_site_pages_editable`, `20261121233000_forum_reactions_reader_presence`, `20261122000100_business_check_constraint_repair`, `20261122000400_gallery_photos`, `20261122000500_media_privacy_tighten`, `20261122000600_business_discovery_rpc_reconcile`, `20261122000800_business_logos_ads`, `20261122010000_form_rate_scope_widen`. Applying any of these requires the documented safety path (restorable backup, per-unit definition comparison against the live catalog, isolated rehearsal) and the owner's per-path authorization; several depend on objects the inventory says are absent live. **This verification could not query the live database** (no credentials in this environment), so this list is inferred, not measured.
4. **Branch protection on `main`** is still `false` — the manual PR gate remains the only merge gate (owner decision O10).
5. **Payments/marketplace money path**: no Paystack runtime code exists (only a configuration-inventory status entry). Owner decision O11 open. Storefront/subscription product remains unbuilt (Phase 7).
6. **Forum polls**: no `forum_polls` code anywhere in the apps; the 2026-11-20 inventory records the tables absent live. Polls are effectively unbuilt.
7. **CSP enforced**: still report-only in both apps (owner decision O8 open).
8. **Email delivery, sender authentication, Paystack, Maps provider**: still unverified (unchanged from audit verdicts).
9. **Radio Guts FM rights/availability** (O12): live page renders Radio Lagos with honest states; Guts FM lookup/rights still unconfirmed.
10. **Migration reconciliation mechanics**: duplicate local timestamps `20261107213000` and `20261114190000`, ledger-version mapping, and the storage-objects policy baseline (no `storage.objects` policies in any migration) remain unresolved (O5).
11. **Section 5 future enhancements** (unchanged, not started): event ticketing, emergency contacts, scholarship/job board, e-learning, English/Yoruba support, AI-powered local assistant. Native mobile remains deferred until the website release gate passes.
12. **Release-gate items still shallow**: hosted email verification flow end-to-end, five-width Playwright evidence against the current build, and post-merge verification on `main` after the next release SHA (CI is green on `e3e791f`; the release decision O14 remains the owner's).

## Do-next order (verified)

1. Decide + supply live-DB read access (or run the read-only catalog checks on the owner's side) to jointly (a) diagnose the live `/forum` error and (b) produce a true applied/unapplied migration ledger.
2. Fix the forum defect once diagnosed; PR with evidence.
3. O3 decision on `admin_member_delete` (drop the call or fix+apply the redesigned RPC).
4. Backup/restore rehearsal, then the safety-path migration applies units (O5/O6 sign-off), starting with the ones the new features depend on (business discovery/photos/ads, media admin, site pages, maintenance mode).
5. Then CSP enforcement plan (O8), payments decision (O11), radio rights (O12), branch protection (O10).

## Live-database reconciliation and actions — 2026-11-21 (owner-connected Supabase MCP)

Read-only catalog reconciliation against the real ledger (`supabase_0eec_list_migrations`, 79 entries, latest `20261121173539 form_rate_scope_widen`). The 2026-11-20 inventory is heavily superseded: the history, tourism, forum-polls, people, media, marketplace-reconciliation, member-messaging-reconciliation, business-check/repair, gallery, ads and site-pages units were all applied 2026-11-21 under dashboard-authored ledger entries, most with names embedding the local versions.

Of 76 local migration files, 74 are semantically applied (objects verified present in the live catalog: all forum tables incl. polls, history_records, tourism_destinations, orders/products, programmes/episodes/radio_schedule/radio_rights_records, reader_presence, forum_reactions, business_staff_create, article_publish/guard_article_version, comment_report_resolve, radio_authoring_save, published_articles.body). The genuinely unapplied set was two files, and both were applied with owner authorization:

- `20261120170000_system_backup_capabilities` — the three `backup.read` / `backup.create` / `backup.restore` capability reference rows were absent; applied as-is (idempotent INSERT, reference data only, no grants; app stays fail-closed until the owner grants the keys to staff roles). Verified after apply: all three rows present.
- `20261121130000_site_maintenance_updated_at_trigger` — the `site_maintenance_set_updated_at` trigger was absent; applied as-is after verifying `set_updated_at()` exists live. Verified after apply: trigger present.

No other production writes were made. No destructive path was touched (newsletter RPC decision O7, member-delete path O3, payments O11 remain owner-gated and unapplied).

## Forum defect root cause and fix — 2026-11-21

Vercel production runtime logs (read-only) identified the `/forum` error boundary: `Error: Attempted to call countActive() from the server but countActive is on the client` (every `GET /forum` request, production deployment `dpl_BQByP1tVQpBdjA1tn4wHWGyAvqRU`). Cause: `app/forum/page.tsx` imported `countActive` from `./live-count`, a `"use client"` module, and invoked it in the server component — not callable server-side. Fix on PR #239 (commit `0aa8a61`): `countActive` moved to server-safe `app/forum/active-count.ts`; `live-count.tsx` now only exports the client component. `pnpm typecheck` 5/5 exit 0 and Vitest 128/128 after the fix. The logs also confirmed `GET /api/radio/guts` honestly reports "Naija Radio catalogue did not return a unique usable Guts FM record" (O12 state unchanged).

Production deployment verification (Vercel API, read-only): production alias serves `main` `e3e791f7787cd8992f71ab6df6e1ad2609081fc8` (`dpl_BQByP1tVQpBdjA1tn4wHWGyAvqRU`, READY).
