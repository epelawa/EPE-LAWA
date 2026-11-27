# EPE LAWA — Consolidated Master Plan

**Single source of truth.** This file consolidates every active project document (master plan, product requirements, page specs, design system, architecture, security, integrations, roadmap, tracker, schema runbook, execution checklists, progress logs and all handoff notes). Superseded files were removed from `docs/`; historical snapshots remain only in `docs/archive/` and in git history.

**Last updated:** 2026-11-23 · branch `vibe/feature-program-65dede` · owner: Epe Lawa (info.epelawa@gmail.com)

---

## 1. Product and scope

EPE LAWA is a web-first community platform for Epe Division, Lagos State: news, heritage, civic discussion, radio, tourism and local business. The current release includes all eight client-approved web areas:

1. **Trending News** — editorial workflow (draft → review → publish → unpublish), revisions, tags, author bylines, comments with helpful votes, article views/read tracking, breaking-news rotation.
2. **Itan Ilu Mi / My Community History** — member contributions with private review (`/admin/itan-ilu-mi/review`).
3. **Chat Forum / Digital Village Square** — threads, replies, moderation, report flow, topic/category follows with notifications.
4. **Map & Navigation** — safe outbound Google Maps search/directions URLs only; no Maps API key, no geocoding. Offline maps are optional future work.
5. **Epe Business Directory** — listings, search, claim flow with verdict queue, contact-click tracking, featured slots, gallery.
6. **Historical Sites & Tourism** — destinations with review workflow.
7. **EPE LAWA Radio** — live player, programme schedule, archive with search, on-air now-playing, member song requests with staff desk queue.
8. **Who is Who in Epe** — community profiles.

Cross-cutting: member signup/OTP email verification/login/recovery, secure separate staff sessions with capability checks, admin analytics, real workspaces for member submissions, audit trail, privacy, honest empty/loading/error states, community events calendar with ICS feeds, site-wide poll, weekly email-digest composer (copy-to-clipboard; no email sending), moderation appeals, member dashboard with self-service security (password change, sign-out everywhere).

**Homepage corrections (merged in PR #271):** Public sponsor placements and popup are no longer mounted; the header retains the brand logo while the extra hero logo is removed. The incomplete language switch is hidden. Support enquiries remain in the private staff queue, with a manual email reply link; this is not an automatic ticket conversation or status portal. Dashboard in-app notifications refresh while open. The follow-notification repair was applied to Supabase on 2026-11-26 (migration ledger `20261126103500`, `repair_follow_article_notifications`); browser push is not offered pending end-to-end delivery verification. Intake, acknowledgement email and staff notifications depend on their existing server configuration. Homepage news and breaking reads stream independently of the hero; the news section alone shows a skeleton while its real data loads. The hero photo rotation has no persistent manual pause control at the owner’s request; it pauses on hover, keyboard focus within the hero, reduced-motion preference, or when the page is hidden. This leaves an accessibility limitation for visitors who cannot use those mechanisms.

**Commerce: removed by owner decision.** All payment/Paystack, order, buyer/seller and storefront code was removed from the backend, UI and environment (including Vercel Paystack variables). Advert placement is paid **manually** for now; legacy marketplace/payment tables in the database are out of product scope. Do not reintroduce payment claims.

**Section 5 future enhancements (roadmap, not implemented):** event ticketing, emergency contacts, scholarship/job board, e-learning, full English/Yoruba i18n (the incomplete starter toggle is hidden), AI-powered local assistant. Native mobile apps are deferred. On real store availability: never report a waitlist success unless a verified persistent storage route saves the submission; the app UI always says the native mobile app is deferred and continues on the web.

---

## 2. Architecture and toolchain

- pnpm 10.34.9, Node ≥22 <25, Turbo. Typecheck via `cd frontend && pnpm exec turbo run typecheck --force`.
- **Public app** `frontend/apps/main` — the site served at the Vercel domain; `/admin/*` is a same-origin compatibility layer that re-exports pages from the admin app (guard layout: `AdminAccessGuard` + `SessionGuard`).
- **Staff app** `frontend/apps/admin` — canonical staff app; `adminHref()` resolves base paths. All new staff pages are built in this app; re-export stubs in main keep same-origin `/admin` parity.
- **Shared UI** `frontend/packages/ui` — PageFrame, Panel, SectionHeading, StatusBadge, Notice, EmptyPanel, `buttonClassName`, icons.
- **Migrations** `backend/supabase/migrations` — forward-only, never rewritten (AGENTS.md §6).
- **Tests** `frontend/vitest` (unit), `backend/tests/schema.test.mjs` (node), `frontend/tests` browser-smoke (Playwright, 320/375/768/1024/1440).
- Route manifest `frontend/apps/main/public/manus-routes.json` is asserted by `frontend/vitest/member-space-contract.test.ts` (must never include `/auth/complete`) and updated whenever routes change.
- Root scripts: `test`, `test:node`, `test:unit`, `typecheck`, `build`, `test:browser-smoke`, `audit` (`scripts/audit/run.mjs`).

---

## 3. Database conventions

- RLS on every table; `revoke all … from anon, authenticated` then targeted grants.
- Capabilities via `public.has_capability('…')`: `article.create`, `article.review`, `article.publish`, `article.unpublish`, `moderation.review`, `business.review`, `radio.manage`, `people.manage`, `advertising.manage`, `backup.read`.
- Security-definer RPCs use `set search_path = ''`.
- Rate limiting: `form_rate_allowance(scope, limit)` with the `form_rate_buckets_scope_check` constraint enumerating every scope; a new scope requires widening that check.
- Apply migrations against project `igqmybuiovaxqmrteebd` (Supabase MCP), then **verify the ledger row** (`supabase_migrations.schema_migrations`) and insert it manually if absent — the apply step does not always write it.
- Never bulk-replay historical migrations; live ledger history diverges from filenames. Use new unique versions.

**Applied 2026-11-23 (feature program, verified live):** `20261123030000` feature tables (comment votes, topic follows, claims, click counters, events, song requests, site polls, appeals + notify trigger) · `20261123080000` `auth_password_change` rate scope · `20261123090000` `staff_analytics_timeseries` / `staff_analytics_top_articles` · `20261123100000` `staff_digest_snapshot` · `20261123110000` `article_version_tags_json` + `published_articles` view recreated with `tags` · `20261123120000` feature-program FK indexes (business claims, appeals, site polls).

**Known `published_articles` contract:** the view is `security_invoker` and does NOT include relational columns added later; use the `article_version_tags_json(uuid)` aggregator (granted to anon/authenticated) instead of selecting tags directly from stored tables.

---

## 4. Security and permissions

- Authorization enforced server-side and in RLS policy — hiding a button is not authorization. Staff and member sessions are separate; staff actions re-check capability fresh per action.
- Public contact identity is "Epe Lawa" with inbox `info.epelawa@gmail.com`, sourced only from `frontend/apps/main/lib/site-identity.ts`.
- Editing staff member with `article.publish` publishes directly; revision transitions validate `expectedRevision`, reject stale values, and audit.
- Form actions return `{status, message}` states; RPC errors mapped to honest member-facing messages.
- Member security: email verified at signup (OTP), password change re-verifies the current password via `signInWithPassword` then `auth.updateUser`, sign-out-everywhere on demand.
- Moderation appeals (`member_bans` + `moderation_appeals`): members can appeal an **active ban** via `member_appeal_moderation`; staff decide via `staff_decide_appeal` (gate `moderation.review`, decision note required). Content-hide actions remain staff-internal — members cannot see or appeal them (documented limitation because `moderation_actions` rows are not member-readable).
- Admin member-delete is **disabled** pending audit-before-effect fix and data-deletion owner sign-off.
- Fixed light theme only; no theme toggle, no persisted theme preference.

## 5. Design system

- **Palette:** Midnight `#0A1023` (primary text), Navy `#17264A` (deep emphasis), Royal Steel `#294B91` (links on light), Cobalt `#477FE0` (primary actions, Midnight text on cobalt 4.84:1), Ice Blue `#A7C5F5` (focus/non-text accents only on light), Cloud `#F1F4FA` (canvas), Silver `#A6B2C5` (non-text accents), Border `#293650`.
- **Type:** checked-in Plus Jakarta Sans variable WOFF2 subsets served locally in both apps (SIL OFL; never describe as Codec Pro); compact ~90% scale, hero ≈56px, body ≥16px, metadata 14px, labels 12px, article measure 62–72ch.
- **Motion:** Apple-style restrained micro-motion — staggered hero cascade, shortcut tile cascade, card lift + press feedback, cover zoom; all guarded by `prefers-reduced-motion`; motion is brief, drawers trap focus and close on Escape/tap-out/navigation.
- SVG icons only, no emoji; 44px touch targets; visible focus; WCAG 2.2 AA target.
- Imagery: `.webp` preferred for in-app art (`/brand-logo.webp`); `public/brand-logo.png` (512px, optimized) is retained **only** for the email template (`auth-mail-hook.ts`). No unused originals in `public/`.

## 6. Integrations and provider truth

| Concern | Status |
| --- | --- |
| Hosting | Vercel; verified live on `https://epelawa.vercel.app` (preview deploys per PR). |
| Database/auth | Supabase `igqmybuiovaxqmrteebd` (eu-west-3), live and used for all reads/writes. |
| R2 image uploads | **Shipped (merged via PR #249, 2026-11-22):** application image writes use the Cloudflare REST API and current `r2.dev` setup; server-side optimization normalizes accepted raster images to metadata-stripped WebP, caps dimensions at 2048px and stored output at 900 KiB. Avatar preview payloads are capped at 200 KiB. Existing R2 objects have not been rewritten. |
| Advert payment | **Manual** for now (owner decision). No PSP in the app. |
| Transactional email | Supabase Auth mail hook with branded PNG-logo template. Newsletter SMTP (`NEWSLETTER_SMTP_*`, `NEWSLETTER_FROM`) not yet configured/verified — the digest composer deliberately copies text for manual sending. |
| Payments | Removed. Never claim live payment behavior. |
| Maps | Outbound search/directions URLs only; no API key. |
| Analytics | Admin analytics from real queries (`article_views`, `business_contact_clicks`, `profiles`); unavailable ≠ zero. |
| Backup metadata listing | **Shipped (merged via PR #249, 2026-11-22):** Cloudflare’s R2 `result` array and `last_modified` field are parsed; `.sha256` sidecars are excluded, and cursor pages are followed (up to five). If the safety bound is exceeded, the page reports unavailable rather than showing a partial inventory. **Configuration on Vercel is the remaining owner step:** the admin app needs `R2_ACCOUNT_ID`, `R2_BUCKET_PRIVATE`, `CLOUDFLARE_API_TOKEN` (listing) and `BACKUP_DISPATCH_TOKEN`, `BACKUP_WORKFLOW_REPO` (dispatch; `BACKUP_WORKFLOW_REF` optional) as server-only variables. The backups desk and settings desk now name exactly which of these are missing. |

## 7. Staff destinations (canonical map)

Newsroom (list/editor/revisions/diff/settings/tags), Reviews (business, itan, moderation/forum, corrections), Community (events queue, song requests), Trust (appeals), Broadcast, Media, Members, Users, People, Roles, Settings, Site pages, Legal pages, Ads, Backups, Enquiries, Site poll, Email digest, Analytics.

---

## 8. Remaining roadmap (verified, current)

Compiled from code state on 2026-11-23, not from stale checklists:

1. **Email delivery** — digest auto-send is built (2026-11-24): weekly digest composer gained a Delivery action (capability-gated `article.publish`, `useActionState` pending UI) that renders every active subscriber (cap 500) through `digest-mailer.ts` → staff `staff_digest_snapshot` RPC → escaped email shell with an honest unsubscribe footer; SMTP readiness is surfaced on the page via `digestSmtpConfigured()`. Remaining: verify SMTP variables + sender-domain auth (SPF/DKIM/DMARC) with a private test recipient.
2. **Full Yoruba i18n** — shipped: toggle, footer chrome, header nav + drawer groups, homepage hero/shortcuts/news/community sections, `<html lang>` switching, dictionary parity test. Remaining: page bodies inside each module (news article UI, forum, business, tourism, member dashboard tabs).
3. **Browser-smoke refresh** — `/events`, `/radio/archive` and `/radio/programmes` added to the public-routes audit (2026-11-24); remaining: admin-route smoke passes (analytics/appeals/digest/poll/events/radio-requests) and re-runs across all widths.
4. **Admin compat surface** — extend `frontend/apps/main/app/admin` re-exports if same-origin parity matters for any yet-existing route (new routes are stubbed now).
5. **Security audit gate** — BLOCKED: the external scanner (`founda-scan`) is not obtainable from any registry in this environment (`npm view founda-scan` exits 1); re-run `scripts/audit/run.mjs` and wire CRITICAL warnings into CI once obtainable. Internal gates (node/unit/typecheck/build, security headers, RLS-first migrations) remain enforced.
6. **Backup/restore rehearsal** — never evidenced; required before destructive DB operations. Backup/restore workflows are shipped (admin backups desk); the rehearsal dispatch itself is owner-gated (needs a production restore target).
7. **Schema reconciliation follow-ups** from the 2026-11-20 audit: duplicate local migration prefixes (`20261107213000`, `20261114190000`), 9 broken-ish historical files classified in the git-history reconciliation doc.
8. **Who is Who / Itan Ilu Mi review ergonomics** and tourism photo provenance updates beyond the reference set.
9. **Legal review** — controller identity, retention, terms, privacy handling, Nigerian legal review before publication-grade claims.
10. **Custom-domain decision** — `epelawa.com` vs `epelawa.vercel.app` vs `epelawa.ng` (superseded split); DNS/TLS/canonical/robots verification, cookie scope, sitemap.
11. **Section 5 enhancements** (owner-selected, not built): event ticketing, emergency contacts, scholarship/job board, e-learning, AI assistant.
12. **Member messaging (DMs)** — the forum now delivers the channel-based community chat experience (2026-11-25); direct 1:1 messages, voice notes, media attachments in chat and typing/read-receipts via Supabase Realtime/Presence remain blueprint-only.
13. **Offline maps** — optional future work; needs owner decision.
14. **Radio playback verification** — official stream URL, rights/permission, browser playback testing.
15. **Admin analytics breadth** — add forum/thread activity + events/radio-request metrics when data volume justifies.
16. **Push notifications** — delivery path AND sender are wired (2026-11-24): `public/sw.js` push worker, authenticated rate-limited `/api/notifications/subscribe` route writing through the `push_subscription_register` RPC (migration `20261124130000`), and `NotificationPrompt` mounted in the layout. The sender is complete: `web-push-send.ts` implements exact http_ece aes128gcm encryption + ES256 VAPID (dependency-free, node builtins only; DER→raw signature bug found and fixed by roundtrip tests) and `/api/push/dispatch` (bearer-`PUSH_DISPATCH_SECRET`, kind→preference column, 501-subscription batches, 404/410 cleanup, 8s timeouts) is hooked into newsroom publish via `after()` (never delays publication). Remaining is owner-only: set `NEXT_PUBLIC_WEB_PUSH_ENABLED=true`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PUBLIC_KEY` (same value), `WEB_PUSH_VAPID_PRIVATE_KEY`, `WEB_PUSH_VAPID_SUBJECT`, `PUSH_DISPATCH_SECRET` in Vercel (values shown in-session, never committed).
17. **AI Scheduler** — rebuilt with a real backing service (2026-11-27, migration `20261129080000`): OpenRouter free models (shuffled per call, automatic failover, `openrouter/free` last; key in `OPENROUTER_API_KEY`), an autopilot switch plus one-off auto-on/auto-off times and a daily Lagos-time window applied by pg_cron every 5 minutes (single-use nonce to `/api/ai/tick`, no shared secret). Jobs: hourly news from 18 listed outlets only (Epe → Lagos → Nigeria → world, fact guard on figures/quotes, Editorial Desk byline, source cover + credit, hashtags, new categories), enquiry replies that state the AI assistant wrote them, business verification (publishes only with independent evidence, never rejects), daily rotation of AI-placed slots among approved paid sponsors, comment moderation, hourly admin-activity explanations. With autopilot off every action is escalated with a recommendation. Audit at `/admin/ai-processes`; admin sign-ins/actions/IP/device/geo at `/admin/logs` (primary administrators only). Articles: one redesigned layout, image share is the only share option, guests comment and like without an account.
18. **Live radio stream** — schedule/on-air/`.ics` shipped; the live stream depends on the Guts FM rights decision (O12).
19. **Who is Who human verification evidence** (O9) — verification badges require recorded human review.
20. **Branch protection on `main`** — not set; the repo was temporarily flipped PUBLIC by the owner so free CI could run (2026-11-25) and MUST be flipped back to private in Settings → Danger Zone once CI is green — App tokens cannot change visibility (403).
21. **Live-UX hardening** — shipped (2026-11-25, `vibe/ux-hardening-65dede`): shared live-validation toolkit (`@epelawa/ui` `LiveField`/`validateField`/`controlError`, red shake once per invalid transition, reduced-motion-safe) replacing ALL browser-native validation in flagships (business submit, news composer, progressive editor, auth steps, enquiry form — `reportValidity`/`checkValidity` banned and enforced by the new `pnpm ux:audit` sweep); rolling-spinner `SubmitButton` (backup desk wired); `SaveState` autosave pill on the newsroom composer recovery drafts; realtime superscript badges on admin sidebar items fed by the extended `/api/live/queues` (now also counts events, song requests, appeals and open forum reports every 45s); native `window.confirm` replaced by the branded dialog in `ConfirmSubmit`; preconnect hints for the Supabase and R2 origins on both apps; press-state micro-motion with reduced-motion gates.
22. **Backups delivery configuration (owner-only)** — the backups page now diagnoses the gap itself: it shows an actionable alert listing exactly `BACKUP_DISPATCH_TOKEN` (GitHub token with actions:write) and `BACKUP_WORKFLOW_REPO=epelawa/EPE-LAWA` when dispatch is unconfigured. The backups "not configured" banner disappears only after those two Vercel variables are set and redeployed.
23. **Analytics fix** — `staff_analytics_timeseries` referenced `total` ambiguously (42702 on every authenticated call); migration `20261122113000` renames all internal aliases and is APPLIED LIVE and verified under an emulated authenticated staff principal. The PR carries the migration file for repo/DB parity.
24. **Staff content management** — shipped (2026-11-25, migration `20261125140000_staff_content_management.sql`, APPLIED LIVE as ledger row `20261122100145`): `/admin/roles` renders again (`CAPABILITY_GROUPS` moved to a server-safe `lib/capability-groups.ts` — the server page no longer calls `.flatMap` on a client-module reference); `/admin/business-review` gained a live-listings section where every published business can be edited in place (prefilled form, live validation) or deleted completely via audited `business_staff_delete` (purges photos, reviews, verifications, featured/ad slots, claims, click counts and legacy commerce rows first); `/admin/moderation/forum` now lists recent chats and messages with reason-gated removal (and restore) through `forum_staff_thread_delete`/`forum_staff_post_delete`/`forum_staff_post_restore`; new `/admin/moderation/comments` desk edits (audited `comment_staff_update`) or tombstone-removes (audited `comment_staff_delete`, open reports auto-actioned) article comments. All RPCs are security definer, `require_capability`-gated and audit-logged; all staff deletes write a reason of at least 5 characters.

## 9. Known honest limitations

- Email digest: auto-send action is built (staff-triggered, capability-gated); nothing leaves the server until SMTP variables are verified (owner copies text outward as fallback).
- Appeals: ban-only (see §4).
- Admin analytics data (`article_views`/`business_contact_clicks`) only has meaningful volume after traffic; empty renders must say "no data yet", not claim zero activity.
- Paystack environment variables were removed from Vercel; ensure nobody re-adds them.
- Production deployment status of this branch must be verified from Vercel evidence after merge — never inferred from green checks alone.

## 10. Verification gates (repo rules)

1. `pnpm test` (node + unit), `typecheck`, and a fresh `pnpm build` on the exact head before any merge/claim.
2. Playwright browser-smoke per UI change; reduced-motion and keyboard checks for any new motion; `pnpm ux:audit` must report zero NEEDS-FIX (native popups/validation bans).
3. No secret values in code, fixtures or commit messages; env names documented in `.env.example`.
4. Commit author: **Epe Lawa <info.epelawa@gmail.com>**; commit per verified phase.
5. Delivery: feature branch → PR → green checks → merge. Never push implementation commits to `main`.

## 11. Changelog of major phases (condensed)

- **Foundation:** eight web areas, auth/staff sessions, editorial workflow, schema rollout, business directory, tourism, radio player, who-is-who.
- **2026-11-20/21:** master audit + migration reconciliation (34 applied / 12 not applied / 9 broken classification), maintenance mode, security headers/health endpoint, visual tokens.
- **2026-11-22 (owner request):** the maintenance gate default flips to **enabled**; only `MAINTENANCE_GATE_ENABLED=false` opts a deployment out, and the settings desk button works whenever the reviewed maintenance RPCs answer. The gate still fails closed on database errors (site shows the 503 maintenance page; `/admin` stays reachable) and the edge reads are debounced by a 10-second cache.
- **Earlier 2026-11-23 batch (PR #243, on main):** site-wide search, RSS feed, forum sort, related destinations, radio on-air + schedule .ics, gallery lightbox, business opening hours, member avatar upload (R2), sign-out-everywhere, profile strength, CSV export, Lagos timestamps, print styles, web app manifest, share-on-X, sitemap lastmod, and the "suggest a correction" flow (member modal + staff corrections desk, migrations `20261123010000`/`20261123020000` + site identity module). Upload pickers as blur-backdrop popup modals (PR #242); CSP with per-request nonce (PR #241); orders/selling/payments UI removal (PR #240).
- **Ops hardening batch (2026-11-25, `vibe/ops-hardening-65dede`):** (a) **Unauthorised-session bounce policy** — new `createStaffClient()` wrapper in admin `lib/supabase.ts`: a dead/stale staff session (Supabase `session_not_found`, surfacing as `Unauthorized`) bounces to `/login?reason=session_expired` for a fresh token pair instead of rendering "page could not load"; every (protected) page and action file now uses it, with the client created OUTSIDE try/catch so the redirect is never swallowed; root layout keeps plain `createClient()` (/login detect). (b) **Forum community v2** — chat-bubble thread views (own messages in navy bubbles), unread dots and per-channel pills via new `forum_thread_reads` table + `forum_unread_threads`/`forum_thread_read_mark` RPCs (migration `20261124150000`, applied live), personalized home with search and floating new-chat FAB, sticky composers, debounced `/api/forum/read` read-ping. (c) **Digest auto-send** — see roadmap §8.1. (d) **Web push sender** — see roadmap §8.16. (e) Admin supabase-js aligned to `^2.118.0`; new test files: `push-delivery`, `admin-session-bounce`, `digest-send`, `forum-community-live`.
- **Feature program, later batch (this branch, 2026-11-24):** newsroom publish composer (since 2026-11-27 it sits beside the article list on the Newsroom page — no popup; dashboard CTA links to `#upload-article`; `/newsroom/new` remains the full-page fallback); web-push delivery path wired end-to-end up to VAPID provisioning (`sw.js`, subscribe route, `push_subscription_register` RPC + `push_subscribe` rate scope, both migrations applied live); AI Scheduler stub retired from nav/routes/tests. Forum made operational: eight owner-named categories seeded (migration `20261124140000`, idempotent) and the forum rebuilt as a messaging-app surface (sticky app bar, topic rail, conversation stream; global footer suppressed on every forum route). Member dashboard gains notification channel preferences — in-app and push toggles per channel, saved through a session-scoped upsert on `notification_preferences` (dashboard-only, never public). Paystack/orders/storefront removal (code + env + UI); comment helpful votes; topic follows + notifications; article tags end-to-end (incl. `published_articles.tags` fix); author byline pages; site poll + admin composer + public results; business gallery/claims/click tracking/featured slots; community events calendar + ICS; radio archive + song-request desk; dashboard security card; moderation appeals (member + staff); staff analytics; Yoruba starter toggle; revision diff viewer; weekly digest composer; new admin nav group; `.webp` asset pass (public dir 37MB→8MB, unused 22MB hero originals deleted); docs consolidated into this file; `manus-routes.json` refreshed.
- **Sponsor ads + UX hardening batch (2026-11-25):** `SponsorSlot` line-up driven by admin-selected businesses with a rotating carousel (PR #250 merged); PR #249 conflict resolved and merged; this branch adds the live-validation system, save-state, nav badges, spinner buttons, branded confirm dialogs, preconnect hints and the `scripts/ux-audit.mjs` sweep (report in `docs/ux-audit-report.md`); staff-analytics ambiguity fixed live via migration `20261122113000`.
- **Staff content management (2026-11-25, this branch):** `/admin/roles` fix (server-safe capability catalogue), business-review live-listings edit + full-delete with audited purge RPCs, forum chat/message removal + restore with reasons, and the `/admin/moderation/comments` desk for editing/removing article comments — migration `20261125140000` applied live (seven new RPCs verified in `pg_proc`, ledger row present).
- **Spinner + pending-state audit (2026-11-25, this branch):** every server-action submit button across the admin and member/main surfaces now rolls a spinner through the shared `SubmitButton` (22 pages; newsroom publication tools, moderation desks, roles, members/users, radio, media, appearances, poll, broadcast, corrections, events, legal/site pages, forum thread + composer, member dashboard preferences/notifications/sign-out, save-story/bookmark, language toggle, site poll). GET-method search forms are deliberately excluded (no server action to wait on); the parallel session's settings page is left untouched. `scripts/ux-audit.mjs` gained a new `no-pending-submit` NEEDS-FIX rule so plain submit buttons in server pages fail CI from now on.
- **Admin navigation and Newsroom UX (2026-11-23, this feature branch):** mobile Admin drawer slides in from the left; ordinary Next.js route links prefetch on intent and show accessible pending feedback while navigation completes. Newsroom header and empty-state upload controls now open the same composer directly, with the existing `?compose=1` deep link and `/newsroom/new` fallback retained. Roles uses compact native disclosures for role editing and staff assignment, with permission/staff counts; server authorization and existing role actions are unchanged.
