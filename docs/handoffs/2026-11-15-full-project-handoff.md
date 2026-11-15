# EPE-LAWA — Current project handoff and roadmap

**Updated:** 2026-11-15 11:10 WAT (Africa/Lagos, UTC+01:00). This is the current checkpoint for the next operator; older status notes below the latest dated entries are historical, not proof of current behavior.

## Executive handoff

The current `main` commit is `6935d32ed35a2b2e2a2966c3d0d8c4cbfeac9e4a`. PR [#99](https://github.com/epelawa/EPE-LAWA/pull/99) is merged. The newest Vercel Production deployment is **READY** for that exact commit, but the public News experience is not healthy: `/news` returns HTTP 200 while rendering its load-error state, and both direct story URLs return HTTP 200 with the site's generic not-found screen. This is not evidence of missing content: a read-only Production SQL query found both approved story rows.

The immediate database diagnosis is confirmed: the live `/news` query selects `published_articles.cover_url`, but Postgres returns SQLSTATE `42703` (“column … does not exist”); the matching `20261115093000_news_cover_urls.sql` migration is in merged `main` but absent from the current Production migration ledger. Do not alter stories or their history. After this docs-only PR is ready, apply that already-merged additive migration with the Supabase migration tool, verify the ledger and objects, then retest the public list and both story routes. If either story page remains not-found, trace the public-role result separately; do not infer success from a 200 response.

No feature code or database migration is part of this documentation PR. The next code PR is the single owner-requested consolidated UI follow-up; do not split the related News/navbar/Admin/cover changes, and do not include Tourism/schema-gap work.

## Verified release state

| Area | Current evidence | Status |
| --- | --- | --- |
| GitHub | Fresh API check at 2026-11-15 11:07 WAT: `main` is `6935d32…`; PR #99 is MERGED at `2026-11-15T09:55:23Z`; no open PRs were listed. PRs #96, #97 and #98 are also MERGED. | Verified |
| Vercel | Latest Production deployment `dpl_DzSq1gizWNSRVYPeG9kr4F7wakFe`, `READY`, URL `https://epe-lawa-ppa8oypug-epe-lawa.vercel.app`, built from the exact `main` SHA above. | Deployment verified; workflows are not healthy merely because the deployment is READY. |
| Canonical `/news` | `https://epelawa.vercel.app/news` returned HTTP 200 at 2026-11-15 11:07:38 WAT, but its HTML contains the newsroom load-error state and still contains the label `EPE LAWA · NEWSROOM`. | Failing live behavior |
| News backend | Supabase Edge log at 11:02:22 WAT records `GET /rest/v1/published_articles?...&cover_url...` as 400. The related Postgres log at 11:02:23 WAT says `column published_articles.cover_url does not exist`, SQLSTATE `42703`. | Root cause confirmed for the feed query |
| Migration ledger | Supabase returned 22 applied migration entries, latest version `20261115003732` (`newsroom_reference_settings_20261115`). The source migration `20261115093000_news_cover_urls.sql` is not in that list. | Merged source / Production ledger drift confirmed for this migration |
| Approved News records | Read-only Production query returned two rows: “Abiru urges Lagos voters to support Tinubu at Epe APC rally” (`Politics`) and “Lagos APC says Epe airport construction is expected to begin in 2027” (`Lagos News`), both by Epe-Lawa Editorial Desk. | Rows present; no content was changed |
| Active categories | Fresh Production query returned seven active categories: Business, Entertainment, International News, Lagos News, Other, Politics, Sports. | Verified |
| Story routes | Direct canonical requests for both `/news/<slug>` URLs returned HTTP 200 but rendered `Article not found | EPE LAWA` / “Finding your page.” The route exists at `frontend/apps/main/app/news/[slug]/page.tsx`; its public view lookup can return a not-found state when no row is visible. | A second unresolved live discrepancy; retest after the cover migration, then trace public-role/RLS/query behavior if it persists |

The older estimates of **20 missing relations/views and 25 missing RPCs** are stale and are intentionally not repeated. No fresh full schema-gap count was performed. A broader source-versus-ledger reconciliation has not been recomputed; the missing News cover migration above is directly verified.

## Completed work that must not be repeated

- **PR #99 — News reference redesign, Advertise, newsletter state and remote covers:** merged normally. Its code replaces the earlier rotating/breaking-ranked experiment with one static forest-green/white editorial layout, adds `/advertise`, adds a newsletter UI that is explicitly non-collecting while delivery is unavailable, and supports versioned external cover metadata. The code is deployed, but the live page cannot demonstrate the layout until its data contract is repaired. The request to remove `EPE LAWA · NEWSROOM` remains outstanding.
- **Earlier News release history:** PR #97 (five visibly distinct minute-changing layouts) and PR #98 (removal of the breaking-ranked layout) are merged, but PR #99 supersedes that rotating presentation with the owner-requested stable single layout. Do not restore rotation or repeat publication actions.
- **Two approved stories:** the two records above were previously created, edited, published, unpublished, verified, and restored through the authorized Admin flow. Preserve their exact copy, covers, bylines, source/license credits, and version history. The Hamzat/TOOPC story remains unpublished pending corrected wording and approval.
- **Categories:** the seven active categories above are the completed expansion. Do not create duplicates or modify article copy/bylines.
- **Member handle:** the owner’s existing profile/dashboard was previously verified as `@brave_hx` after a handle-only change; other account fields were reported unchanged. This was not rechecked in this incident. Do not repeat the update or change any other account field.

## Current owner-approved UI work — not yet in a code PR

The owner asked for one consolidated follow-up PR, based on current `main`, covering these related items:

1. Finish News live-load diagnosis, remove the exact `EPE LAWA · NEWSROOM` label from the public News page, and make the list and both approved story routes render real Production data. The feed error is confirmed; the public story-route discrepancy remains unresolved until post-migration verification.
2. Replace the public hamburger/drawer-overlay navigation with the supplied green reference navbar, use the actual EPE-LAWA logo, keep essential routes directly reachable, and provide an accessible “More” dropdown. The design must wrap or otherwise remain usable on phone widths without reintroducing an overlay.
3. Redesign the Admin dashboard to the supplied reference at `/home/ubuntu/upload/OC2SqGy4iw8y6dh68KDNxu/277642.png`. Do **not** reproduce its sample figures, chart, activity, newsletter counts, or article content. Use only real database-backed metrics and activity; omit any data that is not actually available.
4. Carry forward still-unreleased cover refinements: exact trusted image-host allowlisting, accessible URL/source/license validation, and responsive full-bleed `object-fit: cover` rendering. The lead/above-fold cover must not lazy-load; offscreen cards may. The already-merged migration keeps cover metadata versioned and existing storage keys intact.

The public-navbar references are `/home/ubuntu/upload/JEhCP0oBVdcQV2Bl2ZHkCO/277641.png` (desired) and `277714.png` (current hamburger example). Existing screenshots in the repository are local visual QA and some use fixture content. Do not present them as actual Production content or use fixture stories/metrics in the next PR. Capture fresh desktop/mobile screenshots with real records after the live routes recover.

**Current local code-only worktree:** `/workspace/EPE-LAWA-live-followup` is based on PR #99 merge `6935d32` and currently contains uncommitted cover/accessibility follow-ups applied from the earlier News worktree. It is not the docs branch and is not yet a feature PR. Preserve these changes; start the consolidated feature branch from the newest `main` and transfer only the relevant reviewed edits. It does not yet contain the new navbar or Admin redesign.

## Honest provider and storage state

- The merged Advertise page says enquiries are unavailable, and the newsletter UI is disabled/non-collecting. Do not submit, store, or claim successful signup/enquiry delivery. Earlier checks found `RESEND_API_KEY` empty; that environment value was not rechecked in this docs-only pass.
- A saved Gmail SMTP credential exists for project work, but it has not been configured for newsletter/advertising intake and no end-to-end message has been delivered. Production had no deployed Supabase Edge Functions in the latest earlier inspection. Supabase’s hosted Edge Function limits document outbound restrictions on ports 25 and 587; Gmail documents SMTP on port 465, but port 465 has not been verified from this project. See [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits), [Supabase Auth SMTP configuration](https://supabase.com/docs/guides/auth/auth-smtp), and [Google’s Gmail SMTP settings](https://developers.google.com/workspace/gmail/imap/imap-smtp). Do not add Gmail sending to the UI PR unless a secure server-side path and real test-recipient delivery are both verified. Otherwise retain the unavailable state and record the blocker. Never put secrets in source, PR text, logs, or Vercel client-side variables.
- Direct cover uploads remain unavailable: a Storage bucket/policy was reported unconfigured in the prior Production audit and was not rechecked here. Until a bucket and safe upload policy are configured and tested, offer URL support only and do not claim that upload works.

## Other Production modules and scope boundaries

Earlier project checks reported risks in Forum authoring/polls, Community History, Business/Map listings, Tourism, Who-is-Who, Radio programming/catalogue, and Admin moderation. Several related migrations or UI fixes have since been reported, but these routes/workflows were **not freshly checked in this docs pass**. Mark their current live state **unverified**; do not repeat old object-gap counts or claim either failure or completion without new evidence. Tourism reconciliation/database-gap work is explicitly outside the consolidated News/UI PR and should resume as separate work only after the owner-directed UI phase.

## Security, data and release rules

- Preserve all existing user records, published stories, credits, version history, roles, audit history, and the migration ledger. No reset, `DROP`, `TRUNCATE`, `DELETE`, destructive rewrite, fake ledger entry, or blanket migration replay.
- The merged cover migration was inspected: it adds nullable metadata fields, validation helpers/constraints, wrapper RPCs and extends the existing public view; it contains no `DROP`/`TRUNCATE`/`DELETE` or migration-ledger edits. It has **not** been applied in this checkpoint. Apply it only through the Supabase migration tool, then read back the exact version and view/column behavior.
- Do not change the two published stories or publish the held story. Do not expose the primary-admin email or any secret. Keep Google sign-in disabled until it is actually configured. Preserve server-side staff authorization on `/admin/*`.
- Use normal GitHub review/merge only when the exact PR head has healthy required checks. No bypass, forced push, or claim of full platform completion based on builds or HTTP 200 alone.

## Next phases and rough estimates

1. **Finish this docs-only PR:** commit only this handoff plus the current roadmap/progress-log references; verify the diff is docs-only, open the PR from current `main`, inspect checks and merge normally only when healthy. *(About 15–30 minutes, excluding any CI queue.)*
2. **Restore and recheck News:** apply `20261115093000_news_cover_urls.sql` with `apply_migration`; verify the migration ledger and `published_articles` columns; re-query the two rows and seven categories; test `/news` and both article URLs on Production. If the two story routes still render not-found, trace exact anonymous PostgREST response/RLS/client configuration before changing UI. *(About 10–30 minutes if the migration succeeds; longer if the public-view discrepancy remains.)*
3. **Build one consolidated UI PR:** implement the navbar, News label removal, Admin redesign, and relevant cover refinements from latest `main`; use real data only. Keep upload and email claims disabled. Exclude Tourism/schema-gap work. *(Roughly 3–5 hours implementation.)*
4. **Exact-head quality and release:** rerun pinned Node 22/pnpm 10.34.9 typecheck, both app builds, full suite, affected Admin/News flows, accessible keyboard/reduced-motion checks, and Playwright at 320/375/390/768/1024/1440px plus 200% text scaling. Attach fresh desktop/mobile screenshots. Open one PR, wait for required checks, merge normally only when healthy, then verify the exact Vercel Production SHA and the real public workflows. *(About 1–2 hours for gates/screenshots, plus 20–45 minutes for review/deploy verification.)*
5. **Email and unrelated modules:** do not extend the UI PR with SMTP unless a secure sender and real end-to-end delivery are verified; otherwise document the blocker. Re-audit other Production modules separately with fresh route/schema evidence. *(SMTP may take 1–3+ hours plus provider configuration; broader module audits are separate work.)*

## Exact resume point

- **Documentation PR worktree:** `/workspace/EPE-LAWA-docs-handoff`, branch `docs/project-handoff-2026-11-15`, based on verified `main` `6935d32`. This PR must contain documentation only.
- **Feature follow-up worktree:** `/workspace/EPE-LAWA-live-followup`, based on the same merge commit with the uncommitted related cover/accessibility changes. Preserve it, but do not commit directly on its local `main`; after this documentation PR is handled, create a feature branch from the newest `main` and transfer only reviewed changes.
- **First implementation action after this docs PR:** recheck current Production ledger, apply the already-merged cover migration through Supabase MCP, and verify `/news` plus both article routes before starting the consolidated UI changes.

**No code, production migration, content edit, or account change was made while preparing this handoff.**