# 2026-11-23 — Feature program status, half-built audit and remaining backlog

Scope of this record: everything implemented under PR #243 (20-feature program, correction reports, site identity, admin hours), the reconciliation migrations, the still-open backlog items, and the recommendations list presented to the owner for selection.

## Implemented — verified on `vibe/features-batch1-65dede` (PR #243)

Batch 1 (commit `823e608`):

1. Site-wide search at `/search` across news, businesses, tourism, people and forum threads.
2. RSS 2.0 feed at `/feed.xml` (indexing-gated, managingEditor/webMaster set).
3. Forum sort toggle (active / newest / most posts, pinned first).
4. Related destinations on tourism pages.
5. 404 page suggestions across all eight modules plus `/search`.
6. Radio on-air highlight (Lagos-clock based).
7. Radio schedule `.ics` export at `/api/radio/schedule.ics`.
8. Gallery lightbox with keyboard navigation.
9. `/` focuses the search field on listing pages.

Batch 2 (commit `5791345`):

10. Business opening hours: submit form editor, staff review display, public profile display, Open-now/Closed-now badge (Epe time).
11. Member avatar upload modal (`media/avatars` via R2).
12. Sign out everywhere (`scope: global`).
13. Member-since date and profile strength meter on the dashboard.
14. Business review queue CSV export (`business.review` gated).
15. Lagos-time timestamps across news/forum.
16. Print stylesheets (news article + global chrome).
17. Web app manifest (`app/manifest.ts`).
18. Share on X on articles.
19. Sitemap lastmod for news.
20. Correction entry point on articles (see below).

Correction reports + identity (commits `2e9fe6b`, `e851897`):

- Live migrations `20261123010000_article_correction_reports.sql` (table, RLS review-gated reads, `member_file_correction` + `staff_resolve_correction` security-definer RPCs, audit trail) and `20261123020000_article_correction_report_indexes.sql` (FK indexes + `set_updated_at` trigger). Both applied to production with owner authorization and verified live (table present, 1 trigger, 5 indexes, 0 reports).
- Member "Suggest a correction" modal on articles (rate-gated server action → `member_file_correction`); signed-out members get a mailto prefilled with the article title.
- Staff "Corrections" desk (`article.review` gated) with resolve/dismiss forms and handled history; nav entry added.
- Site identity centralised in `frontend/apps/main/lib/site-identity.ts`: "Epe Lawa" / `info.epelawa@gmail.com` used in RSS managingEditor/webMaster, `.ics` ORGANIZER, correction mailtos and `.env.example` mail sender identity (`AUTH_EMAIL_FROM`, `NEWSLETTER_FROM`, `AUTH_GMAIL_USER`). A public-copy test enforces the inbox lives only in that module.

Conflicts resolved: PR #243 was reconciled with merged `main` (#240 orders removal, #241 CSP nonce, #242 upload modals). The only content conflict was `admin/app/(protected)/business-review/page.tsx` (eyebrow rename + hours column); both kept.

Superseded by owner decisions (2026-11): selling/checkout/payments removed from the product; advertisements are paid manually off-platform. Paystack env vars blanked in Vercel (hard deletion left to owner); AGENTS.md/00-master-plan wording refreshed; historical migration files that reference payments remain untouched (forward-only rule).

## Half-built inventory (verified 2026-11-23)

1. Push notifications: dashboard components exist but are unmounted; no `sw.js`, no subscribe route. Backend subscription capability is live. Needs a decision + front-end finish.
2. Supabase Storage baseline policies: `storage.objects` policies are not captured in the migration history. Deliberate – the platform does not use Supabase Storage for media (all media writes go through Cloudflare R2); documented here rather than "fixed" with policies on unused storage.
3. AI Scheduler: admin nav entry is `comingSoon`; no feature behind it.
4. Live radio audio: schedule/on-air/`.ics` shipped; the live stream depends on the Guts FM rights decision (O12).
5. Newsletter delivery: footer intake works; actual sending depends on the Vercel/Supabase SMTP identity being set (`AUTH_EMAIL_FROM` etc.) and provider delivery verification (O7-related decision for the newsletter RPC deployment also still open).

## Remaining roadmap items (not implemented)

- Owner decisions deferred by design: event ticketing; emergency contacts; scholarship/job board; e-learning; English/Yoruba support; AI-powered local assistant; native mobile apps.
- Branch protection on `main` remains `false` (free-plan private repo; needs GitHub Pro or a public repo).
- Custom domain/DNS/TLS (O13) — site still serves `epelawa.vercel.app`.
- Who-is-Who human verification evidence (O9).

## Verification

- `pnpm exec turbo run typecheck --force` — 5/5 packages.
- `pnpm build` — both apps, clean.
- `pnpm test` — 386 node tests + 128 Vitest tests, 0 failures, 1 documented PGlite skip; backend schema tests re-ran against production after the index/trigger reconciliation migration and pass.
- Live DB probes: `article_correction_reports` behaves (0 reports, trigger attached, 5 indexes); earlier 79-entry ledger reconciliation stands.
