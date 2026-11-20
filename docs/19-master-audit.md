# EPE LAWA — MASTER AUDIT, REPAIR PLAN & RELEASE REPORT

**Date:** 2026-11-20
**Repository:** `epelawa/EPE-LAWA` (local clone `/public/EPE-LAWA`)
**Audited commit:** `49bf9d80ef50afb119d6f2a415b72e864696eee0` — *"Merge pull request #191 from epelawa/arena/3621f1ff-epe-lawa"* (2026-11-20 08:43:25 +0100)
**Production Supabase project:** `igqmybuiovaxqmrteebd` (eu-west-3, Postgres 17.11, ACTIVE_HEALTHY)
**Toolchain:** Node v22.23.2 · pnpm 10.34.9 · Supabase CLI 2.117.0 · founda-scan 1.2.0

> **Evidence standard.** Every claim in this report is either (a) directly observed from a command whose output is recorded here, (b) attributed to a named source document as a *claim still to be verified*, or (c) explicitly marked UNVERIFIED. Nothing is asserted as working because a document says so. The scanner is heuristic evidence, not a type checker; tests and human review still decide.

---

## 0. EXECUTIVE VERDICT

| Dimension | Result | Evidence |
| --- | --- | --- |
| Repo cloned / full history | ✅ DONE — 444 commits, not shallow | `git rev-list --count HEAD` = 444, `git rev-parse --is-shallow-repository` = false |
| Dependencies installed | ✅ DONE — 511 MB, clean tree | `pnpm install --frozen-lockfile --registry=https://registry.npmjs.org/` completed |
| Typecheck | ✅ PASS — 5/5 packages, exit 0 | `pnpm typecheck` completed, `TYPECHECK_EXIT=0` |
| Build | ✅ PASS (cache replay) | `pnpm build` exit 0, `2 successful / 2 total`, **both turbo cache hits — no fresh compile in QA run**; prior logs show clean `next build --webpack` successes. CI step 8 also passed on exact head (§4.7) |
| Tests | 🔴 **FAIL** | Local QA `pnpm test`: **321 / 308 pass / 13 fail**; `test:unit` 106 tests / 1 fail; `schema.test.mjs` fails from-scratch migration. CI step 9: **321 / 311 / 10**. Browser smoke **9 failed / 56 passed**. Last 20 runs = 16 fail / 4 cancel / **0 success** (§4.7) |
| Scanner health | 🔴 **76.7 (C) — BLOCKED** | founda-scan 1.2.0: 731 files, 58,335 lines, 83.95% line coverage, **20 CRITICAL / 166 WARNING / 2647 INFO** |
| Migration state | 🔴 **TOTAL DRIFT** | 42 remote ledger versions, 55 local files, **zero filename matches** |
| Audit gate | 🔴 **RESTORED, still red by design** | `scripts/audit/run.mjs` implemented & verified in `fix/ci-audit` worktree (§4.11). Reports real 20 CRITICAL / 166 WARNING — not wired into CI (would be permanently red) |
| Arena transcript | ⚠️ NOT OBTAINABLE | login-gated; webfetch returned only landing page |

**Bottom line:** the codebase is substantial and typechecks, but it is **not production-ready** and the database ledger is in a state where a careless `supabase db push` could do real damage. No bulk migration replay has been performed. Nothing has been committed to `main`.

> 🟠 **Environment incident (2026-11-20):** concurrent agent pnpm operations corrupted the shared store (`node_modules/.bin` and `typescript/bin` emptied), so verification results from the last ~hour are not trustworthy. A single central clean reinstall is required before the final gate. No source file was corrupted — this is dependency tooling only.

---

## 1. WHAT I VERIFIED MYSELF (recon record)

### 1.1 Repository identity
- `gh auth status` → account `epelawa`, scopes `gist, read:org, repo, workflow`.
- `gh api user/repos --paginate` → exactly **one** repository: `epelawa/EPE-LAWA`, private, updated `2026-11-20T09:18:13Z`. This is the "last one being worked on".
- First clone attempt produced a broken partial clone (blobless, `HEAD → refs/heads/.invalid`, stale `shallow.lock`, 1 object). Full fetch failed twice with `RPC failed; curl 56 Recv failure`, `early EOF`. A `--depth 1` clone succeeded; later `git fetch --unshallow origin` succeeded → full 444-commit history.

### 1.2 Toolchain and install
- Registry was globally misconfigured to `https://registry.npmmirror.com` via `/public/.npmrc`, causing repeated `ETIMEDOUT`. Override with `--registry=https://registry.npmjs.org/` fixed it. **No project file was changed for this.**
- `pnpm install --frozen-lockfile` → Done in 3m 4.6s; esbuild postinstall approved by `onlyBuiltDependencies` and completed.
- `git status --short --branch` after install → `## main...origin/main`, clean.

### 1.3 Migration ledger — the critical finding
`supabase migration list` returned **42 remote versions**, from `20261102133703` to `20261120072400`, and **every single row had an empty `local` field**. Local directory has **55** migration files, latest `20261121120000_maintenance_mode.sql`. The remote ledger contains version numbers that do not appear as local filenames, and local filenames that do not appear in the remote ledger. This matches the handoff warning: *"historical versions differ from repository filenames, and some local timestamps collide. Do not bulk replay migrations."*

**Decision:** read-only object inventory first; only new, ordered migrations; never rewrite historical migrations (AGENTS.md §6); never bulk replay. Assigned to the backend specialist.

### 1.4 Missing release tooling
`ls scripts/audit/` → `No such file or directory`. `scripts/audit/run.mjs` does not exist, yet `package.json` declares:
```
"audit": "node scripts/audit/run.mjs",
"audit:security": "node scripts/audit/run.mjs --only=hacking",
"audit:ui": "node scripts/audit/run.mjs --only=ui",
"audit:ci": "node scripts/audit/run.mjs --fail-on=medium"
```
All four are dead commands. This means the documented "security gate" is not actually wired.

### 1.5 Mandatory scanner output (founda-scan 1.2.0)
Full machine-readable output saved to `/public/.cache/founda-scan-epe-lawa.json` (807,764 bytes). Summary:

```
files_analysed 731 · files_with_findings 363 · total_lines 58,335
lines_scanned 48,970 · coverage_pct 83.95
CRITICAL 20 · WARNING 166 · INFO 2647
health 76.7 (C) · readiness 76.7 (C)
layers_flagged [1, 3, 5, 6, 7, 12]   (UI, a11y, slow connections, state/leaks, error boundaries, security)
VERDICT: BLOCKED — critical findings present
```

The 20 CRITICAL findings, verbatim from the JSON:

| # | Rule | Location | Layer | Note |
| --- | --- | --- | --- | --- |
| 1 | pg-conn-string | `backend/tests/schema-audit.test.mjs:38` | 12 | credential-shaped value in tracked source |
| 2 | pg-conn-string | `backend/tests/schema-audit.test.mjs:55` | 12 | credential-shaped value in tracked source |
| 3 | pg-conn-string | `backend/tests/schema-audit.test.mjs:56` | 12 | credential-shaped value in tracked source |
| 4 | empty-catch | `frontend/apps/admin/lib/theme.ts:8` | 7 | empty catch swallows error |
| 5 | empty-catch | `frontend/apps/main/components/radio-player.tsx:16` | 7 | empty catch swallows error |
| 6 | empty-catch | `frontend/apps/main/lib/share-cover.ts:15` | 7 | empty catch swallows error |
| 7 | empty-catch | `frontend/apps/main/lib/share-cover.ts:30` | 7 | empty catch swallows error |
| 8 | empty-catch | `frontend/apps/main/lib/theme.ts:8` | 7 | empty catch swallows error |
| 9 | hardcoded-pass | `frontend/tests/browser-smoke/admin-dashboard.admin-smoke.ts:18` | 12 | credential-shaped value |
| 10 | hardcoded-pass | `frontend/tests/browser-smoke/admin-dashboard.admin-smoke.ts:33` | 12 | credential-shaped value |
| 11 | hardcoded-pass | `frontend/tests/browser-smoke/admin-supabase-stub.mjs:12` | 12 | credential-shaped value |
| 12 | hardcoded-pass | `frontend/tests/browser-smoke/news-cover-feeds.spec.ts:6` | 12 | credential-shaped value |
| 13 | hardcoded-pass | `frontend/tests/supabase-password.test.mjs:106` | 12 | credential-shaped value |
| 14 | hardcoded-pass | `frontend/tests/supabase-session.test.mjs:8` | 12 | credential-shaped value |
| 15 | hardcoded-pass | `frontend/tests/supabase-session.test.mjs:162` | 12 | credential-shaped value |
| 16 | hardcoded-pass | `frontend/tests/supabase-session.test.mjs:202` | 12 | credential-shaped value |
| 17 | hardcoded-pass | `frontend/tests/supabase-session.test.mjs:215` | 12 | credential-shaped value |
| 18 | hardcoded-pass | `frontend/vitest/auth-mail-hook.test.ts:38` | 12 | credential-shaped value |
| 19 | hardcoded-pass | `frontend/vitest/auth-mail-hook.test.ts:41` | 12 | credential-shaped value |
| 20 | hardcoded-pass | `frontend/vitest/configuration-inventory.test.ts:5` | 12 | credential-shaped value |

> These are *credential-shaped* heuristics. The security specialist is classifying each as (a) real live credential → CRITICAL + rotate, (b) isolated test fixture → downgrade with justification, or (c) false positive. No secret value is reproduced in this report.

Notable WARNING/INFO clusters:
- `big-file`: `20261102200006_staff_transitions.sql` 739 lines, `20261102200010_forum.sql` 762 lines, `backend/tests/schema.test.mjs` 1,224 lines.
- `no-try-catch` across 16+ backend test files and admin actions (`broadcast/actions.ts`, `broadcast/page.tsx`, `business-review/actions.ts`, …).
- `no-timeout` × 44 — slow-connection risk (layer 5).
- `important` × 27, `inline-style` × 17 — specificity/token drift.
- `radius-scale`: **6 distinct radius values** (`11px, 12px, 18px, 20px, 22px, 999px`) — violates the locked "2–3 radius values maximum" rule.
- `hardcoded-colour` × **404** — raw hex instead of design tokens.
- `long-line` × 2,132 · `no-error-boundary` × 6 routes · `todo` × 1.
- Scanner verdict: **nothing mechanically safe to auto-fix** — so `founda-scan --fix` was deliberately NOT run.

### 1.6 Source inventory (excluding node_modules)
`tsx 202 · ts 229 · sql 58 · md 141`. Repository also contains 4 committed `.jpg` files and an `artifacts/` tree of screenshots/handoffs — included in the privacy scan.

---

## 2. THE DEVELOPER'S PROVIDED WORK LIST (verbatim, preserved)

> The following block is the updated conversation-wide work list supplied by Mus'ab. It is reproduced verbatim so nothing is lost. Items in it are **claims**, not verified facts — verification results are recorded in the sections that follow.

### 2.1 Current status

- **News:** The newsroom redesign, public search, latest-news homepage, faster breaking ticker and signed-in Discover search have been merged. Staff-selected featured stories, breaking-story deduplication and full Discover visual parity remain open.
- **Business directory:** The redesigned frontend was merged, but **production is still missing the business tables and published view**. The candidate migration has not been applied, so the directory and submissions are not fixed.
- **Forms and support:** Private intake, the staff enquiry queue, progressive form work and a movable support launcher were merged. Real submission-to-inbox and staff workflows still need testing.
- **Radio:** The redesigned player was merged. Guts FM playback remains unverified; the last provider lookup returned no matching station.
- **Deployment:** When checked, the production deployment for PR #183 was still **building**. The preceding production deployment for PR #182 was ready and promoted. A ready deployment does not prove the workflows work end to end.

### 2.2 Remaining work

#### 1. Business directory — currently blocked
- Safely review and rehearse the candidate schema, permissions, submission limits, staff approval and atomic verification before applying it.
- Establish a backup/recovery plan and an appropriate rehearsal environment. Supabase branching was refused on the current plan.
- Confirm whether the earlier reported submission can be found; **recovery has not been established**.
- Verify anonymous discovery, verified-member submissions, staff review, approval and notification emails end to end.
- Add real business photos and hours where available, an area selector, and a dedicated incorrect-information reporting workflow.
- Resolve sponsorship disclosure and the effect of removing the old marketplace/review UI before calling the redesign complete.
- Keep Phase 1 focused on discovery and contact; don't invent businesses, photos or verification.

#### 2. Newsroom and news discovery
- Add an authorized **staff-selected featured-story** workflow.
- Prevent unwanted duplication between the breaking banner, featured story and cards without losing stories when breaking status expires.
- Complete signed-in Discover's visual parity with the public newsroom. Its **search behavior** was aligned in PR #183, but production browser verification remains.
- Test direct links, navigation, back/forward, scroll restoration, category controls, empty/error states and mobile accessibility.
- Verify bylines, reading time, related stories, cover fallbacks, credits, canonical metadata and actual social-sharing previews.
- Review the requested additional article presentation styles against accessibility and real content.
- Verify breaking labels and admin controls using published, authorized and unexpired stories.

#### 3. News content and editorial operations
- Research, verify and publish the requested **15 additional real articles** through the authorized workflow. The last recorded check did not establish that they had been published; this needs a fresh content audit.
- Verify dates, claims, sources, bylines, image rights and whether a story genuinely qualifies as breaking.
- Verify newsroom access and publishing with an authorized staff account; local tests are not proof of live publication.

#### 4. Newsroom authoring and media
- Finish the progressive create/edit flow and private autosave or recovery, without accidentally publishing recovery content.
- Complete accessible upload/edit dialogs, validation, progress, error recovery and server-confirmed feedback.
- Verify storage permissions, file validation, image processing, cleanup, accessibility descriptions and attribution.
- Preserve SEO, cover and rights metadata while simplifying the editor.
- Define and implement safe revision-checked public edits, article and secondary-image deletion, reuse behavior and audit.
- Define scheduling with timezone, cancellation, retries, authorization and audit.
- Complete admin social settings and authenticated staff password-change flow; keep remote URL handling protected against SSRF.

#### 5. Forms, email and support
- Test newsletter signup, confirmation, duplicate requests and unsubscribe with a real inbox.
- Test contact, advertising, corrections and support submissions through to the private staff queue.
- Verify staff access, resolution and audit records, plus Gmail notifications and acknowledgements.
- Finish the progressive approach across complex forms, including advertising WhatsApp and contact details.
- Complete durable support ticket tracking, replies, status/resolution search and operational handling. The current support intake issues a ticket number but is **not a full ticketing system**.
- Test the movable support button on mobile, keyboard and across routes.
- Apply and schedule reviewed retention cleanup; define enquiry retention/deletion and add alerts for failed delivery, backlogs and cleanup.

#### 6. Database and security
- Reconcile the production schema and migration ledger; historical versions differ from repository filenames, and some local timestamps collide. **Do not bulk replay migrations.**
- Establish and rehearse backup/restore and review RLS, grants, RPCs, storage policies, trusted-proxy identity and abuse controls.
- Complete the broader security assessment of authentication, staff capabilities, secrets, payments and protected actions.
- Review the report-only Content Security Policy before enforcement.
- Review the prepared member messaging/deletion migration separately; it remains unapplied because of deletion, storage, broadcast and idempotency concerns.
- **Correction to the older list:** `article_set_breaking` is present in production and its migration is recorded. An authenticated real write has not been verified.

#### 7. Identity, members and staff
- Verify signup, sign-in, OTP, recovery, session expiry and member/staff isolation.
- Test staff roles, capabilities, revocation, stale revisions and audit on protected actions.
- Complete username uniqueness, availability and anti-enumeration review.
- Verify saved stories, notifications, profile updates and offline-reading behavior.
- Complete safe member messaging and account-deletion design before enabling destructive operations.
- The custom Auth email-hook cutover remains deferred; provider configuration is not proof of email delivery.

#### 8. Radio
- Investigate why the provider lookup does not find Guts FM and verify the actual stream before claiming it works.
- Verify stream rights, availability, schedules and archive behavior.
- Test reminder delivery and clearly communicate any platform or delivery limitations.
- Confirm the redesigned player and controls on real mobile browsers.

#### 9. Other platform areas and integrations
Audit and complete real workflows rather than assuming that an existing page is operational:

- **Itàn Ilú Mi:** private submissions and media, consent, rights, provenance, review and corrections.
- **Forum:** posting, polls, moderation, authorization and abuse controls.
- **Map:** safe directions; Maps, Places or geocoding only with an approved provider.
- **Tourism:** sourced records, submissions and moderation.
- **Who Is Who:** verified profiles, review and corrections.
- **Storage and payments:** test uploads and access policies; verify Paystack sandbox, webhooks and payment flows before claiming or enabling payment functionality.
- **Analytics:** define purpose, access, consent, disclosure and retention. Existing article view counts are not live visitor or geographic analytics.

#### 10. Dependencies, legal and release verification
- Recheck and resolve or safely mitigate the reported high-severity `picomatch` advisory; its current status needs a fresh audit.
- Restore or replace the missing `scripts/audit/run.mjs` security-audit entry point if it is still absent.
- Complete privacy, terms, moderation, retention, image-rights and Nigerian legal review.
- Verify domain, DNS and TLS if a custom-domain launch is intended.
- Run the full route and role matrix at **320, 375, 768, 1024 and 1440px**, including keyboard, focus, screen-reader semantics, reduced motion and reflow.
- Test loading, empty, denied, error, success and provider-failure states.
- Run full builds, tests, browser smoke and security gates on the exact release candidate, then verify the deployed commit and real public/authenticated workflows.

### 2.3 Future ideas, not completed scope
Native apps, event ticketing, emergency contacts, scholarships and jobs, e-learning, bilingual support and an AI assistant remain future roadmap ideas.

### 2.4 Older statements that are now superseded
- The unsafe newsletter signup RPC was subsequently restricted in production; live newsletter testing is still outstanding.
- Form rate limiting and private-enquiry staff migrations were subsequently applied; this does not verify delivery or the complete workflow.
- The breaking-news RPC was applied; the older statement that it was absent is outdated.
- Homepage news and dashboard recommendations now use **latest stories**, not popularity ranking.
- The public newsroom redesign and search were merged; the remaining editorial and verification items above still apply.

Main working references named by Mus'ab: `docs/handoffs/2026-11-business-directory-repair.md`, `docs/handoffs/2026-11-newsroom-editorial.md`, `docs/handoffs/2026-11-18-migration-reconciliation-status.md`, `docs/handoffs/2026-11-18-continuation-next-steps.md`. Older documents are historical snapshots needing reconciliation.

---

## 3. NEW REQUESTS FROM MUS'AB (this session)

1. Full, uncompromising audit of the codebase — verify docs claims yourself, do not trust them.
2. Verify which migrations ran; fix/repair what hasn't; create missing tables **and rows** necessary for the app.
3. Scan the whole codebase for secrets exposed to the browser and related security issues.
4. List what he has done wrong, where issues are, and recommendations.
5. List half-baked code, half-done features, half-done wiring — nothing omitted.
6. Verify UI and UX flaws using design laws and principles; research them on the web starting from Jakob's Law, including the supplied "UX LAWS IN ACTION · PART 4" six laws (Closure, Figure-ground, Banner blindness, Parkinson's law, Connectedness, Choice overload).
7. Add new rules to the design tokens, forms and layout; fix form text sitting too close to the form border; chunk forms where possible.
8. Ads: small popup banner rising from bottom to halfway, 2-second auto-close with countdown, "close now" button, non-disruptive. Radio-page ad inside the radio card; reduce radio card height. Hero mobile breaking-news banner smaller (smaller announcement icon + text, slightly rounded border). Ad slot below breaking news and keep the one near the footer (two total). Stronger CTA to patronise businesses.
9. Storefront feature: business owners attach a website link OR use an auto-created storefront slug (`epelawa.vercel.app/Epe-lawa`) managed from a user-dashboard mini-admin — profile picture, business info, verified badges (X/Telegram/Facebook), premium subscription.
10. Obtain the full Arena conversation at `https://arena.ai/agent/01a1e3dd-89bc-7897-855e-9d92cf952078`.
11. Everything in ONE comprehensive report file; list phases; full next step to finish the **website** before moving to the **app**.
12. Run tests to back the evidence.
13. Fixes as PRs, never direct commits to `main`; verify until GitHub and Vercel show no errors and are fully mergeable.
14. Correct flawed scripts if found.

---

## 4. SPECIALIST FINDINGS

> This section is populated as each specialist reports. Placeholders below are intentional and will be replaced with verified findings, not guesses.

### 4.1 Database & migrations (backend specialist) — ✅ COMPLETE (read-only live queries, no DDL)

Full per-file table: `docs/reconciliation/2026-11-20-migration-reconciliation.md` (untracked on branch `fix/migration-reconciliation`). **No `db push`, no DDL applied, no commit, no PR.**

#### Reconciliation result
55 local files classified: **APPLIED 34 · NOT APPLIED 12 · UNKNOWN-BROKEN 9**. Ledger: only **7** local prefixes match remote; **48** local files have no ledger entry, **33** remote versions have no local file. *(Orchestrator note: my own earlier `supabase migration list` read 42 remote versions, the agent reports 40 in both sources — the exact denominator is still being pinned down, but the drift conclusion is unchanged.)* **48 unmatched local versions make a bulk `db push` unsafe.**

#### Two earlier assumptions OVERTURNED by live queries
| Earlier claim | Live result | Corrected meaning |
|---|---|---|
| `must_change_password` missing from production | **FALSE** — live count 1. `staff_profiles` = `user_id, is_active, created_at, must_change_password` | Source reproducibility gap only: **zero column definitions in any migration**. A forward `add column if not exists … default true` would be a **no-op on production**, useful only for fresh environments. Not applied. |
| `staff_roles_authorized()` missing (`private_enquiry_staff.sql:2`) | **FALSE** — live `pg_proc` count 1, zero-arg | `configurable_staff_roles.sql` was right; that SQL comment is **stale**. No action. |

#### Missing objects / seed inventory
- `staff_profiles.must_change_password` — live only; propose source-only column for fresh installs, no clearance RPC unless Mus'ab asks.
- `staff_roles_authorized()` — live, no action.
- `admin_member_delete` — **DO NOT APPLY** (already flagged in §4.3 MEDIUM-3).
- Reference/seed rows (staff roles + capabilities, ad slots, categories) were under investigation when the agent closed — not yet delivered as a confirmed list. **This remains an open gap against Mus'ab's "create missing tables and rows" mandate.**

#### Auth / money / deletion verdicts
- **Auth:** gates fail closed live; a fresh-from-source build would fail to *compile* the seven gated RPCs, not bypass them.
- **Payments:** no order/payment tables live — **no money path exists**. Keep it that way until provider + signed webhooks.
- **Data deletion:** `admin_member_delete` logs a success that may not have happened, deletes `auth.users`, leaves R2 orphans — **blocked**.

#### Decisions needed from Mus'ab (agent's list)
1. Drop or redesign `admin_member_delete` (post-mutation audit + R2 retention) — **blocking**.
2. Approve the idempotent `must_change_password` column for source reproducibility? No clearance RPC added — say if one is needed.
3. Branch name (`fix/…` vs `feat/full-web-implementation`), money schema scope, `btree_gist`, ledger strategy, apply authorisation, storage state.

#### DID / CHECKED / FLAGGED / LEFT
```
DID:      Live-verified both prerequisites; updated recon doc with pentester findings; no DDL, no commit
CHECKED:  pg_proc/information_schema → must_change_password_cols=1, staff_roles_authorized_count=1; git status shows doc untracked, HEAD 49bf9d8
FLAGGED:  Deletion RPC unsafe as written; 48 unmatched local ledger versions make db push unsafe
LEFT:     Commit, push, PR and all production applies — waiting on Mus'ab's decision
```
### 4.2 Browser secret exposure (security specialist) — ✅ COMPLETE (read-only; full-history scan still running)

**CRITICAL: none. No live credential found.** Full-tree grep for `whsec_…`, `sk_live_…`, `sk_test_…`, `sb_secret_…`, `AIza…`, and PEM private-key headers → **zero matches**. No secret env-var name appears in any `.next/static` client chunk.

**Findings:**
| Severity | Finding | Evidence | Fix |
|---|---|---|---|
| MEDIUM | 4 committed JPEGs still in git history (staged `D` in working tree but remain in HEAD). Added by `ad9e045 "Add files via upload"`. Dimensions 736×1308, 736×552, 736×1742, 736×552 — phone-shaped, screenshot-like. EXIF: ICC profile only (`Google Inc. 2016`), no GPS/artist/comment; `strings` found no readable text. **Visual content NOT verified (model cannot render images).** | `git ls-tree -r HEAD`; `identify -verbose`; `strings` | Manual visual review. If they contain member/staff/private data → purge blobs from history (`git filter-repo`). A staged deletion does NOT remove them from clones. |
| MEDIUM | CSP is report-only, not enforced | `main/next.config.ts:18`, `admin/next.config.ts:16` | After reviewing real scripts/media, switch to enforced — needs nonce/hash strategy since no `script-src` is declared. **Do NOT enforce blindly** (would break inline bootstrap + images). |
| LOW | `picomatch@4.0.7` — conflicting advisory picture, see §11 reconciliation | `pnpm-lock.yaml:1184,:2345` | Track upstream; no code change until a patched version exists. |
| LOW | Staff activity cookie is client-writable | `admin/lib/login-actions.ts:40` `httpOnly:false`; `admin/components/session-guard.tsx:29` rewrites via `document.cookie`. Value = Unix-ms timestamp, NOT a token. Real session cookies are `httpOnly/secure/sameSite=lax` (`login-actions.ts:23-25`). | Sign the timestamp or move staleness enforcement to the httpOnly session cookie. |
| LOW | VAPID env-name mismatch | `.env.example:51` documents `VAPID_PUBLIC_KEY`; `main/lib/vapid.ts:1` reads `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Public half only — not an exposure, but the documented name cannot populate the code path. | Align the names. |

**Client–server boundary:** every true secret is behind `import "server-only"` or `"use server"` — `form-server.ts:1` (`FORM_RATE_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`), `guts-radio.ts:1` (`NAIJA_RADIO_API_KEY`, only `import type` reaches client), `api/auth/send-email/route.ts:2,7` (`AUTH_EMAIL_HOOK_SECRET`, signature verified at `:19`), `newsletter-mailer.ts:1` (SMTP secrets), `admin/(protected)/users/actions.ts:1-2` (service role, `:29-30` explicitly no log/return), `admin/lib/configuration-inventory.ts:41-43` returns only `{name,status}`. Browser client uses anon key only (`supabase.client.ts:5-6`). **No RSC payload path serialises a secret** — only a boolean feature flag (`layout.tsx:83`) and status rows.

**Token storage:** no tokens in `localStorage`/`sessionStorage` across 60 storage sites. Values are theme, consent, sound, radio reminders, sponsor flag, support coords, layout flag, viewer id, and newsroom draft text in `sessionStorage` (`session-recovery.tsx:52`) — private content, not credentials. Auth cookies `httpOnly/secure/sameSite=lax/path=/` (`login-actions.ts:21-28`).

**Confirmed clean:** `.gitignore:13-17` ignores all `.env*` except `.env.example`; only `.env.example` exists (all placeholders). All 66 `console.*` in `frontend/apps` log codes/fixed messages only. API routes return fixed messages/booleans. No `productionBrowserSourceMaps`, no `.map` files in either `.next` build, no secret names in `.next/static`. Test fixtures synthetic (`playwright.smoke.config.ts:11` `browser-smoke-placeholder-not-a-secret`; `auth-mail-hook.test.ts:5` `Buffer.alloc(32,42)`).

**Verification commands:** 163 `process.env` reads + 62 `NEXT_PUBLIC_` + 60 storage sites + 65 secret-name refs + 66 console calls + 65 client files + 40 server-entry files all classified; zero `whsec_|sk_live_|sb_secret_|AIza|PRIVATE KEY` matches; 0 `.map` files. **Full-history scan COMPLETE (all 598 commits, all refs) — CLEAN.** Only 5 paths ever matched a secret-like literal, all test fixtures: `backend/tests/schema-audit.test.mjs` (`postgres://[redacted]@example.invalid/…`), `frontend/tests/supabase-adapter.test.mjs` (`sb_secret_not_allowed`), `supabase-password.test.mjs`, `supabase-session.test.mjs`, and `supabase-public-reader.test.mjs` (deleted in `d115f45`; short lowercase suffix in a negative test asserting `{status:"unavailable"}`). **No live credential in any reachable commit; no non-test file ever matched; no `sk_live_`, `whsec_<literal>`, `AIza…` or real `postgres://[redacted]@` anywhere.** Severity ratings unchanged. **The 4 JPEG finding still stands — visual content unverified, needs manual review before the repo can be called clean under AGENTS.md §2.** No files modified.
### 4.3 Broad security assessment (pentester) — ✅ COMPLETE (read-only, no code executed)

**Verdict: no CONFIRMED CRITICAL.** The authorization core is genuinely strong — revision CAS, restrictive RLS, capability checks inside SECURITY DEFINER RPCs, payments genuinely off. No client-controlled role escalation, no browser price trust, no exploitable IDOR, no live payment/webhook charge path. No critical invented to fill a template.

| Sev | Finding | Evidence | Fix | Migration? |
|---|---|---|---|---|
| **MEDIUM-1** | **`must_change_password` gate is unreproducible from source.** `staff_access_foundation.sql:4-8` creates `staff_profiles` with only `user_id, is_active, created_at`. **No migration anywhere defines the column**, yet 7 call sites gate privileged RPCs on it: `member_directory_safe.sql:6`; `member_admin_messages.sql:10,22,40` (list/message/**delete**); `private_enquiry_staff.sql:8`; `maintenance_mode.sql:25,37`. `inventory.md:83` confirms the ephemial schema test fails replaying local history because this production prerequisite is missing. Fail-closed → **not a bypass**, but the intended "change default password first" gate cannot be verified from source; ~~production possession is a handoff claim only~~ **CORRECTED: production HAS the column (live count 1) — real gap is source reproducibility only** (§4.1). | grep `must_change_password` → 7 refs, **0 definitions** | Forward migration `alter table public.staff_profiles add column if not exists must_change_password boolean not null default true;` + explicit audited clearance RPC, then replay schema test. **Production no-op; for fresh installs only.** | **YES** |
| MEDIUM-2 | CSP report-only on both apps; no enforced header; `img-src https:` broad | `main/next.config.ts:18`, `admin/next.config.ts:16` | Collect reports → enforced header with nonce/hash strategy | No (config) |
| **MEDIUM-3** | Member deletion: hard delete, **audit written before effect**, unapplied. `member_admin_messages.sql:37-45` guarded correctly (`:40-41` authorized + active + not must_change_password + target≠self + non-staff + typed email match), but `:42` writes `audit_event('staff','member.delete',…,'success')` **before** `:43 delete from auth.users`; a failed delete leaves a false success record. No R2 object cleanup for `profiles.avatar_key`. File has no remote ledger name (`inventory.md:28`); `:71,81` flag unresolved Auth/Storage/idempotency risk. Admin UI calls `admin_member_delete` (`members/actions.ts`) → likely broken live, not safely live. | `:42-44`, `inventory.md:28,71,81` | Soft-delete profile + queue Auth/Storage deletion; audit **after** confirmed effect; reviewed round | Yes (+ app) |
| LOW-1 | Idle-timeout fail-open + client-writable activity stamp. `session-policy.ts:23-25` treats missing/garbage cookie as "not inactive"; member stamp `httpOnly:false` (`auth/actions.ts:121-127`) forgeable. JWT expiry remains the real boundary. | `:23-25`, `:121-127` | Server-tracked or signed timestamp | App |
| LOW-2 | CSRF primitive `checkBrowserMutation` exported but never wired to a route (`http-security.test.mjs:4-17` only). Mitigated: mutations are Next Server Actions (origin checks) or session-token RPCs. | grep | Wire into mutating Route Handlers; document Next.js reliance | App |
| LOW-3 | Retention purge bounded (1000 rows, `for update skip locked`, service_role only) but **unscheduled** — `:1` says "not scheduled or applied automatically" → never runs | `form_retention.sql:3-36` | Add scheduled service-role invocation | No |
| LOW-4 | Contradictory gate comments — `private_enquiry_staff.sql:2` claims "no staff_roles_authorized() in production" while `configurable_staff_roles.sql:1` claims applied as `20261118081756`. Both pin `info.epelawa@gmail.com`. Effective gate unverified. | `:2`, `:7` | Reconcile to one documented capability gate | Yes |
| LOW-5 | No `storage.objects` policies in any migration; `editorial_storage.sql:1` is "EXPERIMENT ONLY — never deploy as-is"; no upload endpoint. No live finding, but no RLS baseline if uploads are added. | grep storage.objects → 0 | Define storage baseline before enabling uploads | Yes (future) |

#### Authorization matrix (enforced)
Admin layout/actions → `getAdminAccessForSession` throws Unauthorized + `__Host-epelawa-admin` cookie · `forum_report_resolve` → `require_capability('moderation.review')` · `staff_enquiry_list/resolve` → `staff_enquiry_authorized()` · `admin_member_*` → `staff_roles_authorized()` + active + not must_change_password *(if column exists — MEDIUM-1)* · `article_*` transitions → `for update` + `expected_revision` CAS + `require_capability` + atomic `audit_event` · `article_set_breaking` → capability + row lock + revision CAS + published-only + future expiry + audit · `comment_delete` → author-only + soft tombstone + audit · `comment_moderate/report_resolve` → DB-side `require_capability('moderation.review')` (the real boundary) · `order_advance` → `sells_order()`/`order.manage` + state machine at DB · private article reads → restrictive RLS guards · saved stories → owner-only RLS + cascade · roles management → `staff_roles_authorized()`.

#### Payment safety — PASS
Payments disabled by design. `marketplace_and_payments.sql:1-13`: no payment function, webhook, or order-creation function ships; integer kobo; server-side `products.price_kobo` + immutable `order_items.unit_price_kobo`; `payments.provider_reference` and `payment_events(provider,event_id)` UNIQUE for replay safety; anon/auth SELECT only. **No Paystack runtime code** — only optional env entries (`configuration-inventory.ts:26-28`). `requestProductOrder` sends `product_id`+`quantity`, never a price (`order-actions.ts:10-12`). `active_business_sponsorships` requires `status='succeeded' and verified_at not null` — no webhook means sponsorships cannot be activated. No real-charge path.

#### Data deletion — partial
Good: comments author-only, soft, audited (`news_comments_forward_only.sql:127-161`); moderation capability-gated + audited; retention bounded + service-role-only. Problems: MEDIUM-3 plus no confirmation-dialog/soft-delete evidence on admin member-delete beyond the typed-email RPC check.

#### Unverified / limits
No OS sandbox → **no target code, tests, migrations or DB replay executed**; all dynamic claims need validation. Production schema equivalence unknown — `inventory.md:3` "a name match is not proof that SQL is equivalent or fully applied"; 20 local files have no remote ledger name. `must_change_password` production presence = handoff claim. `staff_roles_authorized()` existence contradicted by `private_enquiry_staff.sql:2`. Email/Paystack status unproven. `guts-radio.ts:17-20` localhost blocking visible, DNS-rebinding resistance not fully verified. No critical invented for the template.
### 4.4 Codebase completeness / half-built inventory (explore specialist) — ✅ COMPLETE (read-only)

#### Executive counts
| Dimension | Finding |
|---|---|
| Source TS/TSX (excl. `.next`, `node_modules`) | ~277 files, ~14,700 LOC |
| Current-release web areas | 8 |
| Areas with real DB code + honest states | **8/8** |
| Areas BROKEN against live Production schema | **at least 6/8** — News, History, Forum-poll paths, Business/Marketplace, Tourism, Who-is-Who writes |
| `/admin` same-origin re-export shims into standalone admin app | **20 page shims** + error/not-found re-exports + 1 deliberate `notFound()` catch-all |
| `.rpc(...)` call sites in TS | 88 |
| SQL function definitions | 133 across 52 local migration files + proposals/reconciliation |
| RPCs called from TS but defined only in a **reconciliation candidate**, not any migration | **2** — `business_review_decide`, `business_discovery_search` |
| Vitest files | 43 (+1 mock) · frontend `node:test` 71 · backend `node:test` 22 |
| Playwright smoke | 7 public `.spec.ts` + 1 admin `.admin-smoke.ts` (+4 helpers) |
| Local migrations vs Production ledger | **52 local vs ~35 remote**, no byte-identical files (`2026-11-18-migration-reconciliation-status.md:3`). *(Orchestrator note: my own `ls | wc -l` counted 55 entries — discrepancy to reconcile; both counts signal the same drift.)* |
| Duplicate local migration timestamps | 2 — `20261107213000`, `20261114190000` (`2026-11-20-migration-inventory.md:71`) |
| Deliberate "Coming Soon"/disabled affordances | 6 |
| **Outright fake content** | **NONE** — no invented articles, people, businesses, prices, reviews, map pins, metrics or fake success states |
| Verdict | **No area is provably production-COMPLETE.** Code quality and truthfulness strong; live-schema reconciliation is the dominant blocker. |

#### Feature matrix
| # | Area | Status | Evidence |
|---|---|---|---|
| 1 | Trending News | **BROKEN live / PARTIAL code** | `main/app/news/page.tsx:124` selects `cover_url`; migration `20261115093000_news_cover_urls.sql` absent from Production ledger → SQLSTATE 42703 (`2026-11-15-full-project-handoff.md:9,20-21`) |
| 2 | Itan Ilu Mi | **BROKEN live / PARTIAL code** | `main/app/itan-ilu-mi/page.tsx`, `actions.ts`; correction requests honestly "Unavailable" (`:69-74`). `history_records`, `history_record_sources`, `history_contributions` absent live (`2026-11-20-migration-inventory.md:79`); `history.review` capability absent |
| 3 | Forum | **BROKEN live (polls) / PARTIAL** | `main/app/forum/actions.ts:32,54`; `forum_polls`, `forum_poll_options`, `forum_poll_votes`, `forum_poll_results` absent live; `forum_vote` "cannot run by itself" |
| 4 | Map & Navigation | **COMPLETE** | Safe outbound Google Maps URLs only, no API key — `main/app/map/map-search.tsx:8-21,55`; no fake pins |
| 5 | Business Directory | **BROKEN live / PARTIAL** | `main/app/business-directory/page.tsx:19`, `order-actions.ts:12`; `businesses`, `products`, `orders`, `business_categories`, `business_featured`, `order_items` absent live. RPCs only in `backend/supabase/reconciliation/business_discovery_candidate.sql:58,73` |
| 6 | Tourism | **BROKEN live / PARTIAL** | `tourism_destinations`, `tourism_submissions` absent live; `tourism.review` capability absent |
| 7 | Radio | **PARTIAL → near COMPLETE** | Verified streams, Guts catalogue API, honest errors — `main/lib/radio-lagos.ts`, `guts-radio.ts`, `main/api/radio/guts/route.ts`, `radio-player.tsx:10,57`. Prior Vercel TS failure **fixed in source** (`:10` now accepts `children?: ReactNode`); rights/schedule/archive incomplete |
| 8 | Who is Who | **PARTIAL** | Read tables exist (`who-is-who/page.tsx`, `[slug]/page.tsx`); staff write RPCs (`people_update`, `people_verify`, …) absent live |
| 9 | Member auth | **PARTIAL** | Real implementation `auth/actions.ts:36-175`, `auth/callback/route.ts:17-34`, `auth-mail-hook.ts:18-40`. Provider delivery UNVERIFIED |
| 10 | Staff session & capability authz | **COMPLETE code / UNVERIFIED live** | Fail-closed server adapter `admin/lib/supabase-access.ts:204-332,388-493`; guards `admin/components/admin-access-guard.tsx:7-39`, `session-guard.tsx:57-133`; policy `session-policy.ts:6-26` |
| 11 | Admin app duplication | **PARTIAL** | 20 shims, e.g. `main/app/admin/(protected)/page.tsx:1`; layouts cross-import `main/app/admin/layout.tsx:2-4`, `(protected)/layout.tsx:1-4`; catch-all correctly `notFound()` (`[...unknown]/page.tsx:3-4`) |
| 12 | News publishing | **BROKEN live / PARTIAL** | Revision-checked RPCs `admin/lib/actions.ts:164,217,255,320,349`; cover RPCs/column absent live → same 42703 class |
| 13 | Newsletter | **STUBBED + live security hole** | UI gated off `newsletter/actions.ts:25,41`, `newsletter-form.tsx:10-13`. **Live anonymous `newsletter_subscribe_request` token-replacement vulnerability unresolved** — `20261118030000_newsletter_subscriptions.sql:39,100` grants anon execute. Local pause migration `20261118053000_pause_unsafe_newsletter_signup.sql:5` **NOT deployed** |
| 14 | Contact/correction/advertising intake | **STUBBED** | `ENQUIRY_INTAKE_ENABLED` off (`enquiry/actions.ts:7`); contact page says "No message is received" (`contact/page.tsx:19-31`); support disabled (`support/page.tsx:8`) |
| 15 | Maintenance gate | **PARTIAL** | `settings/maintenance-actions.ts:12`; migration applied remotely (`20261120072400`); gate `MAINTENANCE_GATE_ENABLED=false` (`.env.example:83`); Vercel activation + E2E outstanding |
| 16 | Admin analytics | **PARTIAL** | Real counts `admin/app/(protected)/page.tsx:18`; graphs/real-time/country metrics explicitly NOT built |
| 17 | Branded transactional email | **PARTIAL unverified** | Real templates + signature verification + Gmail/Resend selection; delivery not evidenced |
| 18 | Payments / Paystack | **MISSING by design** | Env keys documented but AGENTS.md §3 forbids claiming operational; order code exists, schema absent |
| 19 | Native mobile apps | **MISSING (deferred)** | AGENTS.md §1 |
| 20 | Six section-5 future enhancements | **MISSING (roadmap)** | Kept distinct from release scope |
| 21 | Migration ledger / deploy automation | **BROKEN** | No byte-identical files, 2 collisions, no backup/rehearsal |

#### Half-done wiring (exact)
1. **Schema drift is primary blocker** — ~88 RPC call sites; live DB lacks `history_records`, `history_record_sources`, `history_contributions`, `tourism_destinations`, `tourism_submissions`, `products`, `orders`, `order_items`, `business_featured`, `business_review_moderation_history`, `forum_polls`, `forum_poll_options`, `forum_poll_votes`, `forum_poll_results` (`2026-11-20-migration-inventory.md:79`, `2026-11-15-production-route-schema-gaps.md:13-28`).
2. **News `cover_url` split-brain** — `news/page.tsx:124` vs missing migration → 42703 live.
3. **Two RPCs only in a non-deployable candidate** — `business_review_decide` at `admin/app/(protected)/business-review/actions.ts:22`, `business_discovery_search` at `main/app/business-directory/page.tsx:19`; defined only in `backend/supabase/reconciliation/business_discovery_candidate.sql:58,73`, which the handoff calls "deliberately isolated candidate, not a deployable migration".
4. **Admin duplication** — 20 shims; changes must be made in `frontend/apps/admin`, not the shim.
5. **Duplicate migration versions** — `20261107213000`, `20261114190000` each name two different files; not duplicate SQL but must be reconciled.
6. **Newsletter pause not deployed** — local revoke exists, live exposure persists.
7. **Maintenance applied but not activated** — gate still false.
8. **Member messaging/deletion candidate not release-ready** — direct `auth.users` deletion can fail on FKs and leaves Storage objects; broadcasts lack idempotency, 10,000-recipient transaction cap (`2026-11-member-messaging-draft.md:3,6-10`). No production change made.
9. **Two capability paths** — `has_capability("admin.access")` (`supabase-access.ts:283-301,458-466`) AND `staff_roles_authorized()` (`main/app/admin/layout.tsx:19`, `admin/app/layout.tsx:33`); both must pass; latter applied to Production 2026-11-18.
10. **Env/doc drift** — `SUPABASE_PUBLISHABLE_KEY` not listed in root `.env.example` (only `SUPABASE_SERVICE_ROLE_KEY` at `:18`); `pnpm-workspace.yaml.bak` leftover.
11. **`staff_roles_authorized()` hard-codes one owner email** — `20261114190000_configurable_staff_roles.sql:18` `lower(u.email)='info.epelawa@gmail.com'`; intentional per handoff but a single-account gate inside a "configurable roles" design.
12. **No verification the RadioPlayer fix shipped** — source fixed, but failing deployment `dpl_49H1q47KCQQp2zzfpF5uw2H1kzfz` for main `585566e` recorded as failed; no later success evidence.

#### Fake/mock content — NONE
Honest placeholders only: Google sign-in disabled + "Coming Soon" (`admin-login-form.tsx:46-48`, `auth-forms.tsx:156-158`); contact "No message is received" (`contact/page.tsx:19-31`); newsletter unavailable (`newsletter-form.tsx:5,10-13`); secure-report coming soon (`guidelines/page.tsx:35`); About badge (`about/page.tsx:45`); support disabled (`support/page.tsx:8`); Guts FM error state (`radio-player.tsx:57`); catalogue cover labelled illustrative (`news-covers.ts:2`); 52 real credited photos with credits surfaced off-hero (`home-refresh.spec.ts:87`); 4 maintenance illustrations described as AI-generated, not real events; browser-smoke stubs use synthetic key `browser-smoke-placeholder-not-a-secret` (`playwright.smoke.config.ts:11`); `editorial_prototype_*` in proposals; business candidate isolated and NOT deployed; archive docs labelled archive. No fake metrics, testimonials, social icons, prices, reviews or coordinates.

#### Docs vs code (selected verdicts)
- `AGENTS.md:1-4` — VERIFIED (8 areas, no invented content, server-side authz, Node/pnpm pins).
- `2026-11-20-migration-inventory.md:79` missing live tables — VERIFIED against code.
- `2026-11-20-migration-inventory.md:75` RadioPlayer Vercel failure — **CONTRADICTED in current source** (fix present); deployment status of fix UNVERIFIED.
- `2026-11-20-migration-inventory.md:71` duplicate timestamps — VERIFIED.
- `2026-11-18-continuation-next-steps.md:8` newsletter token-replacement vulnerability — VERIFIED in source.
- `2026-11-18-continuation-next-steps.md:7,23` picomatch GHSA-fc5q-39xc-vjpf high — **UNVERIFIABLE from source**; no patched version inspected.
- `2026-11-15-full-project-handoff.md:20-21` news routes failing live — PARTIALLY VERIFIED (consistent with absent `cover_url`).
- Historical `.env.example` claim — CONTRADICTED by current file (both public and server names present).

#### Test coverage map
- **Vitest 43 files**: strong contracts — open-redirect rejection, mail-hook signature/tamper/stale-token, form-server fails closed without Vercel header, newsletter confirm/unsubscribe, business verified-badge gating, breaking news, cover validation, session recovery, progressive forms, maintenance, guts radio, recommendation ranking (refuses fabricated zeros).
- **frontend `node:test` 71 files**: source-contract/static-analysis tests (not runtime DB).
- **backend `node:test` 22 files**: PGlite SQL isolation with stubbed auth/capability/audit — **not Supabase/PostgREST**. This is why schema drift went undetected.
- **Playwright 7 public + 1 admin**: real browser at 1280×900 with synthetic Supabase stub; widths parameterized per spec; covers keyboard/focus, reduced motion, hydration errors, overflow, honest empty/error states.
- **Critical gaps**: NO end-to-end test of real member signup/OTP/login or staff password login; NO test against live Production catalog; NO Playwright E2E for the 8 feature areas (contribution, thread/vote, tourism submission, business submission/order, Who-is-Who verification); NO test that the vulnerable newsletter RPC is revoked in a real DB; no single config constant enumerating all five required widths; no coverage report artifact.

#### Bottom line from explore
**Code-complete / integration-incomplete, not done.** The codebase is honest and well-engineered at code level (real DB calls, server-side authz, fail-closed gates, no fabricated content), but 6+ of 8 flagship areas cannot work against the live database, two security items remain open (newsletter RPC, picomatch), and deployment evidence (builds, provider delivery, browser staff flows) is missing.
### 4.5 UX law research with sources (research specialist) — ✅ COMPLETE

**Important correction for Mus'ab:** the phrase "Twenty-four laws. Four parts." traces to a social motion-graphics series (`UX Laws in Action · Part 4`, @motion_ui_interface), **not** a canonical academic taxonomy. The mandate named 26 distinct laws (Hick's = Choice Overload; Part 4 adds Banner Blindness and Connectedness). lawsofux.com currently lists 30. No source supports one authoritative "24" containing all of them. All 26 are listed below with overlaps flagged.

| # | Law | Designer's rule | Source |
|---|---|---|---|
| 01 | Jakob's Law — users expect your site to work like every other site | Copy conventions; innovate only where it earns cost | lawsofux.com/jakobs-law/ (Nielsen 2000) |
| 02 | Fitts's Law — acquisition time = distance + target size | Big near targets; padding beyond the icon | nngroup.com/articles/fitts-law/ |
| 03 | Hick's Law / Choice Overload *(related but distinct: decision time vs demotivation)* | Reduce up front; tier, filter, default | lawsofux.com/hicks-law/ · /choice-overload/ |
| 04 | Miller's Law — ~7±2 items in working memory | Chunk; never show ungrouped strings | lawsofux.com/millers-law/ (Miller 1956) |
| 05 | Proximity — near things look related | Tight label→input (4–8px), loose field→field (24–32px) | nngroup.com/articles/gestalt-proximity/ |
| 06 | Similarity — shared colour/shape/size groups things | One treatment per meaning; reserve colour for primary CTA | nngroup.com/articles/gestalt-similarity/ |
| 07 | Common Fate — things moving together group | Animate related items together only | nngroup.com/articles/visual-design-cheat-sheet/#CommonFate |
| 08 | Good Continuation — eye follows and extends lines | Continuous path implies order | nngroup.com/articles/visual-design-cheat-sheet/#Continuation |
| 09 | Closure *(Part 4 #01)* — eye fills gaps to see a whole | Show part of the next card | nngroup.com/articles/principle-closure/ |
| 10 | Figure–Ground *(Part 4 #02)* | Make one thing dominate; suppress rest | nngroup.com/articles/visual-design-cheat-sheet/#FigureGround |
| 11 | Peak–End Rule — peak + end drive judgement | Engineer success moment and final handoff | lawsofux.com/peak-end-rule/ |
| 12 | Aesthetic-Usability Effect | Get type/spacing/hierarchy right first | nngroup.com/articles/aesthetic-usability-effect/ |
| 13 | Doherty Threshold — <400ms keeps flow | Respond under 400ms or show immediate feedback | lawsofux.com/doherty-threshold/ (IBM 1982) |
| 14 | Zeigarnik Effect — interrupted tasks remembered | Show what's still outstanding | lawsofux.com/zeigarnik-effect/ |
| 15 | Tesler's Law — system complexity is conserved | Push complexity to defaults, not users | lawsofux.com/teslers-law/ |
| 16 | Parkinson's Law *(Part 4 #04)* | Constrain fields, cap length, autofill | lawsofux.com/parkinsons-law/ (Parkinson, *The Economist*, 19 Nov 1955) |
| 17 | Occam's Razor | Delete elements carrying no information | lawsofux.com/occams-razor/ |
| 18 | Goal-Gradient Effect | Show progress, especially near completion | lawsofux.com/goal-gradient-effect/ |
| 19 | Endowed Progress Effect | Credit real prior actions | Nunes & Drèze (2006), JCR 32(4) 504 |
| 20 | Von Restorff Effect | Make the one important item distinct | lawsofux.com/von-restorff-effect/ |
| 21 | Serial Position Effect | Priority items first/last, not mid-list | lawsofux.com/serial-position-effect/ |
| 22 | Framing Effect | State outcome honestly in decision-relevant frame | nngroup.com/articles/decision-framing-cognitive-bias-ux-pros/ |
| 23 | Confirmation Bias | Seek disconfirming evidence; test users who *fail* | Nickerson (1998), doi:10.1037/1089-2680.2.175 *(not re-fetched)* |
| 24 | Anchoring | Truthful anchors; reference price, realistic defaults | nngroup.com/articles/anchoring-principle/ |
| 25 | Banner Blindness *(Part 4 #03)* | Style important notices like content, inline | Benway & Lane PDF (rice.edu) · Benway 1998 (Sage) |
| 26 | Connectedness *(Part 4 #05)* | Join step circles with a continuous rule | nngroup.com/articles/visual-design-cheat-sheet/#Connectedness · Palmer & Rock 1994 |

**Attribution flags:** Choice Overload is not a separate 25th law. Benway & Lane (1998) is valid for the Rice report, but the canonical HFES paper lists **Jan Panero Benway alone** — don't state both as one paper. Connectedness ≠ Good Continuation ≠ Common Fate. Miller's 7±2 is a 1956 absolute-judgement finding, modern capacity estimates lower — heuristic, not law. Tesler's attribution is conventional (primary citation Saffer 2010). Parkinson's is an essay aphorism, not an experiment. Doherty <400ms is an IBM internal figure, not a biological constant.

#### Numeric claim verification — read this before quoting the Part 4 numbers
| Claim | Verified? | Note |
|---|---|---|
| Jam study 24 vs 6 options, 3% vs 30% purchase | ✅ **VERIFIED exact** | Iyengar & Lepper (2000), JPSP 79(6) 995–1006. Paper: "Nearly 30% (31) … limited-choice … only 3% (4) … extensive-choice … X²(1,N=249)=32.34, p<.0001." Display 6 vs 24 jams. Caveat: 24-stop *chocolates* is a different experiment. |
| Carousel peek ≈48px / 32% visible | ❌ **UNKNOWN** | NN/g supports the technique only; envydesign recommends 10–20% visible. No source gives 48px or 32%. **Design taste, not law.** |
| Focus backdrop ≈70% opacity | ❌ **UNKNOWN as rule** | Material scrim **32%**, FanDuel **60%**, secondary guidance 40–70%. 70% is in range but no law prescribes it. |
| Parkinson 30 keys → 7 keys | ❌ **UNKNOWN** | No source found in knowledge base or web. Likely from the Arena conversation — unsourced illustration. |
| Doherty <400ms | ✅ VERIFIED | IBM 1982, exact figure. |
| 44×44 CSS px targets | ✅ VERIFIED — **but AAA in WCAG 2.1** | SC 2.5.5 Level AAA. WCAG 2.2 AA (SC 2.5.8) is 24×24 or spacing exception. **We keep 44×44 as a project standard** (it is Mus'ab's locked rule), but must not call it AA. |

#### Form design & spacing rules (source-backed)
| Rule | Source | Application |
|---|---|---|
| Label must be closer to its input than to any other item — **including a container border** | NN/g form-design-white-space | Form container inner padding **larger** than label→input gap. Labels hugging card edge group with the border — this is exactly your complaint, now with a citation. |
| Label→input 4–8px; input→next field 24–32px | `ui-ux-suite@0.7.3` knowledge base | INFERRED reference numbers, not a W3C standard — use as starting tokens, then test. |
| Labels above inputs; never placeholder-as-label | GOV.UK text-input | Real `<label for>` above every input. |
| Group related controls with `fieldset`+`legend` | W3C WAI分组 tutorial · GOV.UK fieldset | Radios/checkboxes always; also address blocks. |
| Chunk long forms; whitespace can signal groups | NN/g — 15-field form read as 3 groups of 4–6 | Add group headings; don't fake grouping with borders. |
| Visible focus is AA; borders/rings need 3:1 | WCAG 2.1 SC 2.4.7, SC 1.4.11 | Never `outline:none` without `:focus-visible`; check border token contrast too. |
| Reflow at 320px / 400% zoom | WCAG 2.1 SC 1.4.10 | No horizontal scroll. |
| Autofill via standard tokens | GOV.UK · Chrome autofill insights | Directly supports the Parkinson-style postcode-lookup fix. |
| Exact Material text-field inner padding | — | UNKNOWN — no number claimed. |

**Arena transcript:** one fetch returned only the Arena landing page title. Client-rendered/login-gated. **No conversation content obtained.** Nothing in this report derives from it. The "24 laws / four parts" attribution comes from public posts quoting @motion_ui_interface, not Arena.

**Sources index (all retrieved 20 Nov 2026):** nngroup.com/articles/{principle-closure,gestalt-similarity,visual-design-cheat-sheet,form-design-white-space,anchoring-principle,decision-framing-cognitive-bias-ux-pros,aesthetic-usability-effect,fitts-law} · lawsofux.com/{index,choice-overload,goal-gradient-effect,doherty-threshold,jakobs-law,millers-law,teslers-law,occams-razor,peak-end-rule,zeigarnik-effect,von-restorff-effect,serial-position-effect,parkinsons-law} · Iyengar & Lepper primary PDF (faculty.washington.edu) · rice.edu banner_blindness.pdf + Sage 10.1177/154193129804200504 · academic.oup.com JCR 32(4) 504 · w3.org/WAI tutorials + WCAG 2.1/2.2 understanding pages · design-system.service.gov.uk text-input + fieldset · m2.material.io dialogs · fanduel.design modals · envydesign.jp carousel-peek · `ui-ux-suite@0.7.3` npm tarball `knowledge/laws-of-ux.md`.

**Bottom line:** the qualitative laws are solid and citable; of the pasted numbers, only the jam figures and 400ms are source-backed. The 48px/32% peek, 70% scrim and 30→7 keys must be treated as project decisions, never law-derived facts.
### 4.6 UI/UX + design-system audit (designer) — ✅ COMPLETE (read-only)

**Root cause of your form complaint confirmed.** The intended 16px inset tokens exist (`main/app/globals.css:13-15`, `admin/app/globals.css:7-9`, applied at `globals.css:413-415` / `admin/globals.css:173-175`) but the selectors use `:where(form) :where(...)` — **specificity 0,0,0**. Every component rule with real specificity beats them. The tokens exist on paper and lose in the browser.

#### Form spacing audit
| file:line | current | problem | fix |
|---|---|---|---|
| `globals.css:86` | `padding: 11px 14px` | 14px inline | tokenise to 16/12 |
| `admin/globals.css:22` | `padding:11px 14px` | same | tokenise |
| `auth.css:51` | `.auth-field input { padding: 10px 12px }` | **12px inline**; beats zero-specificity token; affects signup/login/reset | `padding-inline: var(--form-control-inline)` |
| `auth.css:275-283` | `padding: 10px 15px` | 15px | token |
| `auth.css:176`, `:357` | `padding-block: 8px` | **8px at ≤360px — worst gap in repo** | 12px block |
| `auth.css:49`, `:175`, `:273` | `gap:5px` → `4px` | label gap collapses to 4px, defeats `--form-field-gap:10px` | use token |
| `auth.css:54`, `:288` | `font-size:11px` / `10.5px` | sub-12px helper text | 12px floor |
| `newsletter-unavailable.module.css:4` | `padding: 0 13px` | 13px | 16px |
| `newsletter-unavailable.module.css:30`, `:38` | `@media(max-width:360px){ padding-inline:10px }` | **10px at 320px — tightest point** | remove override |
| `news.module.css:18` | `padding:0 12px` | 12px | 16px |
| `listing.module.css:153` | `padding:10px 14px` | 14px | 16px |
| `listing.module.css:142` | `padding:10px 16px` | block 10px | 12px block |
| `floating-support.module.css:17` | `padding:11px 12px` | 12px | 16px |
| `admin/news-article-composer.module.css:16` | `padding:12px 14px` | 14px in main editor | 16px |
| `admin/news-share-tools.module.css:14` | `padding:12px` | 12px textarea | 16px |
| `admin/newsroom-list.module.css:13` | `padding:0 36px 0 14px` | 14px left on select | 16px |
| `dashboard.module.css:87` | `padding:9px 12px` | 12px | 16px |
| `dashboard.module.css:28-31` | `.handleField input { border:0 }` | effective inset = global 14px | 16px on wrapper |
| `directory.module.css:10`, `:9` | `padding:10px 12px`; wrapper `0 12px` | 12px | 16px |
| `native-controls.css:28`, `:101` | `padding:10px 12px`, `9px 12px` | 12px in dropdown/file | 16px |
| `admin/login/login-form.tsx:16,20` | `className="field__control"` | **class has no CSS definition anywhere** | define or replace |
| `main/components/admin-login-form.tsx:13,54` | `className="auth-input"` | **also undefined** | define or replace |

#### Ad placement audit
Current slots: `app/page.tsx:39` (after `HomeBreakingTicker` at :37) ✓; `app/page.tsx:111` (after community panel, before `CookieBanner` at :112) ✓ — two home slots as requested; `radio/page.tsx:13` inside card ✓; extras at `advertise/page.tsx:33`, `dashboard/news-content.tsx:227`; global popup at `app/layout.tsx:82`.

Popup `sponsor-popup.tsx:9-37`: 10s delay (:13-18), 2s countdown (:23), "Close now" (:36), pauses on hover/focus/hidden (:26-31), dismisses on form/dialog focus (:28), once per session (:12), non-modal. Honest labelling at `sponsor-slot.tsx:54` and `sponsor-popup.tsx:35` ✓.

Spec gaps:
- "bottom up to half-midway" ≠ current: `sponsor-popup.module.css:1` is `position:fixed; right:16px; bottom:calc(82px + …); width:min(350px,…)` — a corner card, **no upward travel, no entrance keyframes**.
- `sponsor-popup.module.css:2` link `min-height:36px` — **below 44px**.
- No `role="status"` — screen readers get no notification (handoff:5 admits this).
- `sponsor-popup.tsx:32` moves focus to `#main`; confirm `#main` has `tabindex="-1"` or focus is dropped.
- **Weak CTA confirmed:** `sponsor-slot.module.css:45-50` `.action { color:#294b91; font-size:0.82rem; font-weight:800 }` — plain text, no pill, no 44px target, no hover lift.
- Sponsor at `page.tsx:111` sits directly above `CookieBanner` at :112 — banner-blindness collision.
- `sponsor-slot.module.css:9` dashed border + gradient + shadow is correctly ad-shaped, but that is why it must not sit against the consent notice.

#### Radio card audit
Compact override already exists at `radio-player.module.css:23-36`, deliberately overriding `:1-7`:

| selector | original | effective compact |
|---|---|---|
| `.player` padding | `clamp(22px,5vw,50px)`, radius 28px | `clamp(20px,3vw,30px)` |
| `.nowPlaying` | `24px 0` | `14px 0` |
| `.artwork` | `164×164` | `108×108`; `90×90` ≤520px |
| `.playButton` | `86×86` | `64×64` |
| `.status` | `min-height:2.5em` | `0` |
| `.stationList button` | `80px` | `62px` (`:7`'s 64px is dead) |
| `.provider` | `24px 0 0` | `12px` |
| `.sponsor` | — | `16px` top |

Sponsor inside card ✓ (`radio-player.tsx:68` renders `{children}` in `.sponsor`; `radio/page.tsx:13` passes `<SponsorSlot compact />`).
**No measurable target exists**: `docs/handoffs/2026-11-14-radio-lagos-1075-player.md:20` only says "player visible in first fold" at 375×812; `docs/screenshots/radio-lagos-1075/2026-11-14/README.md:3-8` gives no numeric height. Need a documented height budget. Duplicate rule blocks (:1-7 vs :23-36) are a maintenance trap. `.gutsIcon { background:#665cc6 }` at `:5` plus ~20 hardcoded hexes break the locked palette.

#### Hero / breaking-news mobile
`home-breaking-ticker.tsx:19-28`, `home-breaking-ticker.module.css`. Mobile shrink already at `:18`: `min-height:44px; margin-top:12px; border-radius:14px; svg 14×14; label .58rem; items .78rem; pause min-width:44px`.
- `.58rem` ≈ **9.3px** label, `.78rem` = 12.5px ticker text — over-shrunk, below readable floor. Fix to **11px floor**.
- **Two identical `@media(max-width:520px)` blocks** at `:14` and `:18`; `:14` is dead.
- `:2` `.label { background:#ad3030 }` and `:7` `content:"◆"; color:#ffc968` are off-palette; `◆` is Unicode, not the mandated SVG icon. `:12` focus ring `#ffcf69` off-palette.
- Radius 12px → 14px adds another radius value.
- Reduced-motion fallback good (`:15` converts ticker to scrollable).
- `hero-logo.css:9,11` use `clip-path:inset(50%)` — clips the whole 44×44 button to zero area. **Verify/fix `:focus-visible { clip-path:none }`**, else pause/slide controls are invisible to keyboard users.

#### Responsive + a11y (computed contrast)
Midnight on Cobalt **4.84:1** ✓ · Royal Steel on Cloud **7.60** ✓ · Silver on Navy **6.93** ✓ · Ice Blue on Navy **8.46** ✓ · Cloud on Navy **13.49** ✓ · Cobalt on white **3.90 — fails 4.5 for body text** (fine for large text/UI) · focus ring Cobalt 3.90 ✓ · semantic success/warning/error on white 6.04/5.93/6.49 ✓. **Locked palette is compliant; failures come from off-palette hexes.**

Sub-44px targets: `sponsor-popup.module.css:2` 36px · `native-controls.css:105-119` file-selector 36px · `globals.css:248` footer links 40px · `globals.css:330` comment-delete 40px and `:345` **36px** · `native-controls.css:53-54` checkbox/radio 20px.

Focus ✓: `globals.css:85`, `admin/globals.css:22`, `sponsor-popup.module.css:2` 3px cobalt, `branded-dialog.tsx:36,41` native `<dialog>` + focus restore. No `outline:none` in main CSS.

Overflow: `navigation-refinement.css:85` uses `overflow-x:hidden` on `.site-main` at ≤767px — the exact band-aid the standard forbids; find the real overflow. Admin tables `min-width:680px` in `overflow-x:auto` (`admin/globals.css:85,91`) ✓ intentional.

Breakpoints mix 350/420/440/480/520/600/640/760/800/960/1024 — not the mandated 320/768/1024/1440 set. At 320px: gutter 16px ✓, auth ≤350 handling ✓, newsletter 10px inset ✗, ticker label 9.3px ✗.

#### UX law violations found
| law | component | file:line | fix |
|---|---|---|---|
| Closure | home story list / hero carousel | `hero-logo.css:73`, `hero-carousel.tsx:125` | no next-card peek. Only `dashboard.module.css:338` does it (`grid-auto-columns:minmax(260px,82%)`). Use `minmax(0,68%)` + `scroll-snap-align:start` so ~32% peeks |
| Figure-ground | dialogs / drawer | `native-controls.css:241-245`, `navigation-refinement.css:43`, `admin/globals.css:118` | backdrop .58/.56 ✓; staff drawer **.48 too weak** — raise to .56+ |
| Banner blindness | home sponsor vs cookie notice | `page.tsx:111-112`, `notice-refinement.css:13-24` | sponsor directly above CookieBanner; separate by ≥1 section, give notices solid left accent `--ep-notice-accent`, no dashed/gradient |
| Parkinson's | auth/enquiry/profile ✓; gaps | `order-request-form.tsx:4` (`contact_name`), business submit, tourism/history forms | add `autoComplete` per H98 |
| Connectedness | enquiry ✓; business/editor ✗ | `globals.css:419`, `enquiry-form.tsx:38` vs `business-form.module.css:6-7`, `progressive-editor.module.css:6-7` | reuse the connecting-line stepper markup |
| Choice overload | home first fold | `page.tsx:30-32,45,48-55,106-107`; `directory.module.css:13` | hero CTA + radio CTA + 6 shortcuts + community CTA + popup + bottom nav compete; cut shortcuts to 3–4, group categories |

#### Storefront gap analysis
`docs/handoffs/2026-11-form-sponsor-storefront.md:9-11` says explicitly: **"This is not an owner-managed storefront or premium subscription."** Current: submission form accepts an HTTPS website; public pages use a slug and a generic `is_verified` badge (`directory.module.css:14`, `business-directory/page.tsx:34`). Missing entirely (no route/component found): auto-created slug `epelawa.vercel.app/Epe-lawa`; owner mini-admin in dashboard; profile-picture upload with validation; editable business info; **X/Telegram/Facebook verified badges** (only phone/WhatsApp present); premium subscription lifecycle + webhook verification. All must wait for schema reconciliation and isolated rehearsal per handoff:9-10 — do not build UI against unverified schema.

#### Proposed new tokens / rules
`frontend/packages/ui/src/tokens.css` currently holds a stray parallel system (`:2-9`, names like `--ep-ui-lilac`, `--ep-ui-limestone`). Lock the eight palette hexes there, then have `globals.css` reference them.

| path | token / rule | value | why |
|---|---|---|---|
| `ui/src/tokens.css` | `--ep-ui-radius-sm/md/pill` | `8px / 12px / 999px` | repo uses 6,7,8,9,10,11,12,14,15,16,18,20,22,24,26,28 — cap at 3 |
| `ui/src/tokens.css` | `--ep-ui-control-px / -py` | `16px / 12px` | single source for complaint fix |
| `ui/src/tokens.css` | `--ep-ui-control-min-h` | `48px` | inputs scattered 46/48px |
| `ui/src/tokens.css` | `--ep-ui-field-gap / --ep-ui-label-gap` | `12px / 8px` | auth collapses to 4px |
| `ui/src/tokens.css` | `--ep-ui-touch-min` | `44px` | reuse `--touch-min` at `globals.css:61` |
| `ui/src/tokens.css` | `--ep-ui-focus-ring/-w/-offset` | `#477FE0 / 2px / 3px` | one ring everywhere |
| `ui/src/tokens.css` | `--ep-ui-overlay` | `rgb(10 16 35 / .58)` | Figure-ground consistency |
| `ui/src/tokens.css` | `--ep-ui-peek` | `32%` | Closure law |
| `ui/src/tokens.css` | `--ep-ui-ad-exposure/-delay/-rise` | `2s / 10s / 240ms` | ad spec |
| `globals.css` | `.ep-control` utility | `padding-inline:var(--ep-ui-control-px); padding-block:var(--ep-ui-control-py)` | replace zero-specificity `:where(form)` override with explicit class |
| `globals.css` | `@media (pointer:coarse){ … min-height:44px }` | pseudo-element expansion | fixes 36/40px targets |
| `navigation-refinement.css:85` | remove `overflow-x:hidden` | — | find real overflow |
| `home-breaking-ticker.module.css` | `--ep-ticker-label: .6875rem` | 11px floor | 9.3px unreadable |
| `sponsor-slot.module.css:45` | CTA → button-style | `min-height:44px`, pill radius, hover lift | complaint #6 |
| `app/page.tsx:111-112` | no sponsor adjacent to consent notice | ≥1 section gap | Banner blindness |

#### Component state coverage
`.btn-*` / `.ep-button`: default ✓ hover ✓ focus ✓ disabled ✓ — **active ✗ loading ✗ success ✗ error ✗ offline ✗**. Inputs: hover ✗, error partial (`aria-invalid` auth only). Radio player is the strongest: 10/10 states ✓ including 5 error states at `:46`. Sponsor popup has no error state. Search/filter: no disabled/offline. Stepped forms: no disabled/offline. Hero carousel: **no image `onError`, no empty state**. `connectivity.tsx` provides offline toasts.
### 4.7 Build/test evidence (QA) — ✅ COMPLETE (2026-11-20, no source modified)

Executed by QA agent on `/public/EPE-LAWA` at audited head. Exact commands and exit codes:

| Command | Exit | Result | Key output |
|---|---|---|---|
| `pnpm build` | 0 | PASS (cache replay) | `Tasks: 2 successful, 2 total` · `Cached: 2 cached, 2 total` — **full turbo cache hit, no fresh compile in this run** |
| `pnpm test` | 1 | **FAIL** | `# tests 321` · `# pass 308` · `# fail 13`. Because the script is `tsx … && vitest run`, all 13 TAP failures short-circuited — **all 43 vitest files were skipped** in this command |
| `pnpm test:unit` (run separately) | 1 | **FAIL** | `Test Files 2 failed \| 37 passed (39)` · `Tests 1 failed \| 105 passed (106)` |
| `backend/tests/schema.test.mjs` (isolated) | 1 | **FAIL** | `migration 20261119014000_private_enquiry_staff.sql failed: column p.must_change_password does not exist` |
| `pnpm audit:ci` | 1 | **FAIL** | `Cannot find module '/public/EPE-LAWA/scripts/audit/run.mjs'` |
| `pnpm typecheck` | — | NOT RE-RUN | Prior exit 0 recorded §0; QA did not re-run |

Build log shows prior successful `next build --webpack` runs: admin `✓ Compiled successfully in 106s` (BUILD_ID `W_JVRzdeXF15Xa6Dh8mwG`, 21 dynamic routes); main `✓ Compiled successfully in 2.2min` (BUILD_ID `lF2Un1ubIK9KWWJ_r27ur`, 71 routes — 68 dynamic, 3 static). No warning/error/secret/bundle-size/missing-env string in the replayed log. **Caveat: cache replay does not prove a clean rebuild.**

#### The 13 TAP failures — root-caused

| # | Failure | Root cause |
|---|---|---|
| 1 | `schema.test.mjs:104` migration `20261119014000_private_enquiry_staff.sql:8` — `p.must_change_password does not exist` | **GENUINE PRODUCT DEFECT.** Foundation table `20261102133703_staff_access_foundation.sql:4-8` has no such column and **no migration in the repo adds it** — confirms the source-reproducibility gap in §4.1/§4.9. Live DB has the column; a from-scratch chain does not. |
| 2–8 | `admin-newsroom-settings:11`, `admin-roles:2`, `admin-same-origin:28`, `auth-shell:9,101`, `news-feature-readiness:49`, `news-fixed-layout:43` | **Brittle source-text assertions drifted** (regex/exact strings no longer match current source). Test defects, not proof of product defects. |
| 9 | `route-manifest:34` — 6 routes missing from manifest (`/admin/broadcast`, `/admin/enquiries`, `/admin/members`, `/admin/settings`, `/newsletter/confirm`, `/support`) | **REAL DRIFT.** Build log confirms all 6 routes exist in the emitted app; manifest out of sync with the page tree. |
| 10–12 | `site-indexing:28,32,50` — `ERR_NO_TYPESCRIPT` | Test spawns plain `node` on a `.ts` file; Node 22.23.2 refuses TS. Harness/runtime incompatibility — 3 indexing behaviours **not tested**. |
| 13 | `turbo-cache-inputs:25` — extra `MAINTENANCE_GATE_ENABLED` in actual | **REAL DRIFT.** Env allowlist not updated; toggling that flag may not invalidate app builds. |

Vitest (separate run): `maintenance.test.ts:22` `Cannot find package 'server-only'` + 5s timeout. First run also had 4 `Failed to start forks worker` timeouts (`progressive-forms`, `newsroom-session-recovery`, `home-breaking-ticker`, `scroll-to-top`); isolated rerun crashed at Node level (`Assertion failed: err == *pid … uv__spawn_and_init_child`). **Unresolved/environment-sensitive — not confirmed product failures.**

#### Audit gate — confirmed broken
`scripts/audit/` does not exist. All four declared scripts (`audit`, `audit:security`, `audit:ui`, `audit:ci` at `package.json:20-23`) point at the same missing `scripts/audit/run.mjs`. Gate **fails closed** (red, not silently green), but there is no working security/UI report and no `--fail-on=medium` enforcement.

#### Browser coverage (config audited, NOT RUN)
`playwright.smoke.config.ts` → 7 specs / 19 public routes, widths 320/375/768/1024/1440, keyboard + reduced-motion; `playwright.admin-smoke.config.ts` → 1 admin spec (1440×900 + 390×844). **Not run** — no Playwright-managed browsers installed (`~/.cache/ms-playwright` missing); system `/usr/bin/chromium` exists and config honours `CHROMIUM_PATH`; needs ports 3100/54321. Admin config has **no npm script** — manual invocation only. No browser E2E for signup/OTP/recovery, map geolocation, tourism detail, business submission/order, or Who-is-Who.

**Reconciliation with CI:** QA's `pnpm test` = 321/308/13; CI step 9 on exact head = 321/311/10. Same total, 3 more failures locally — environment/worker sensitivity, consistent with the flaky-startup pattern above. Either way: **red, not shippable.**
### 4.8 CI/CD, Vercel, PR state (devops specialist) — ✅ COMPLETE

**The single most important operational finding: CI is red on main and is NOT blocking merges.**

#### Workflows
`.github/workflows/ci.yml` — triggers PR + push to main; `contents:read`; concurrency cancels stale runs; exact toolchain pins (pnpm 10.34.9, Node 22); frozen install; then `typecheck → build → test → audit --audit-level=high → whitespace`. CodeQL job `build-mode:none`. **No secrets referenced.** Actions pinned only to major tags (`@v7/@v6/@v4`), not commit SHAs (mutable refs — HIGH hygiene issue).
`.github/workflows/browser-smoke.yml` — installs Chromium, runs 7 public specs, uploads SHA-labelled screenshots; but `:68 if-no-files-found: ignore` means missing evidence does not fail the job.

**Both workflows currently FAIL.** `verify` fails at step 9 `Test` (321 tests / 311 pass / 10 fail — e.g. `public route manifest matches the Next page tree`, `cross-app raw imports participate in each app build cache key`), so the audit step **never runs**. `public shell` fails at step 8 (9 failed / 56 passed — `dashboard-tabs.spec.ts:280`; five widths in `news-filter-navigation.spec.ts:6`; `:50`; `:74`; `public-routes-audit.spec.ts:55` radio heading `"Listen live."` not found).

#### Run history — 16 failure, 4 cancelled, 0 success (last 20 runs)
Latest: push main `49bf9d8` → CI run `44697062829` FAIL, smoke `44697062850` FAIL. PR #191 head `6839edc` → both FAIL. CodeQL passed in every CI run inspected. **PR #191 merged with both workflows failing on its exact head and on the resulting `main`.**

#### Deployment evidence
| PR / SHA | Vercel contexts | What it does NOT prove |
|---|---|---|
| #183 `9fd5ba9` | `Vercel` success `2026-11-18T11:50:01Z`, `Vercel Deployments – Epe Lawa` success `11:50:43Z` — but URL filtered to branch `arena/30600275-epe-lawa` = **preview** | Not production promotion; CI/smoke red simultaneously |
| #182 `ac512f5` | Vercel success `11:40:48Z` / `11:41:35Z` — preview | Same |
| main `49bf9d8` | Vercel success `2026-11-20T07:45:40Z`, Supabase Preview success; CI/smoke FAIL | **Green deploy on a red-CI commit — deployment is NOT gated by tests** |

`gh api repos/.../deployments?sha=…` returned **empty arrays** for PR heads — no GitHub Deployments promotion records. Vercel dashboard state beyond GitHub status contexts not inspected. No open PRs (`gh pr list --state open` → `[]`), so no candidate PR exists right now.

#### Branch protection — CONFIRMED NONE
`branches/main` → `{"protected":false}`. `/branches/main/protection` and `/rulesets` → HTTP 403 `"Upgrade to GitHub Pro or make this repository public"`. Repo is private, all three merge methods enabled, `delete_branch_on_merge:false`. The manual PR/test gate in AGENTS.md:27 is the only gate and is currently not being honored.

#### Config + env gaps
No `vercel.json` anywhere in the repo — build/root/rewrites/env live in the Vercel dashboard (not inspected). Env names referenced in code but absent/commented-only in `.env.example`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_WEB_PUSH_ENABLED`, `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`, `ADMIN_ORIGIN`, `DATABASE_URL`, 5× `NEWSLETTER_SMTP_*`, `FORM_RATE_SECRET`, `ENQUIRY_INTAKE_ENABLED`, `NEWSLETTER_SIGNUP_ENABLED`, `NAIJA_RADIO_API_KEY`. No secret VALUES found; no `NEXT_PUBLIC_` assignment of a secret key.

#### Advisory status — RESOLVED (contradicts the stale doc)
`docs/14-tracker.md:12` claims high-severity `picomatch` advisory `GHSA-fc5q-39xc-vjpf`. GitHub Advisory API: **WITHDRAWN** `2026-11-18T15:38:56Z`. Other picomatch advisories (`GHSA-c2c7-rcm5-vvqj` high, `GHSA-3v7f-55p6-f55p` medium) cover `>=4.0.0,<4.0.4`; lockfile has `4.0.7` and `2.3.2` — outside range. `pnpm audit --registry=https://registry.npmjs.org` → **No known vulnerabilities found** (all levels). OSV queries `{}`. Dependabot open alerts **0**. Local plain `pnpm audit` fails only because of the dead global npmmirror registry — environment, not a dependency finding. **Keep the audit gate; update the tracker.** (See §11 for the conflicting CVE claim.)

#### PR-rule violations
69 first-parent non-merge commits; 25 `(#NNN)` squash subjects; 11 more PR-associated via API; **33 with no PR association** — historical, mostly pre-#131 bootstrap (e.g. `caafae24` dependabot.yml, `74d8e2ee` footer/header rewrite, `a48abbcb` payments layer, `429c8067` Vercel fix, `ce08fa9` Initial commit). Recent 60 first-parent entries are all `Merge pull request #NNN` — compliant.

#### Release gate (ordered, no mobile work until all closed with evidence)
1. Clean integration base — restore/account for the 4 deleted `.jpg`; work on feature branch, not main. 2. Fix 10 `pnpm test` failures; green on PR head AND post-merge main. 3. Fix 9 smoke failures across 320/375/768/1024/1440; change `:68` so missing evidence fails. 4. Keep `pnpm audit` gate; implement or delete the 4 dead `audit*` scripts; update tracker. 5. Complete `.env.example`; decide one Supabase naming scheme. 6. Inspect Vercel dashboard config (build cmd, root, domains, redirects, CORS/callbacks, cron protection, storage, rate limits, monitoring). 7. Read-only migration reconciliation + **backup restored once**; forward-only plan signed off. 8. Manual PR gate (`protected:false`) — all checks green + review before merge, rerun on main. 9. Record exact production SHA + read-only prod smoke, health endpoint, uptime/error-rate alerts, no secrets in logs. 10. THEN mobile.

### 4.9 Implementation round 1 — health / headers / routes (backend agent) — ✅ COMPLETE, UNCOMMITTED

Spot-checked by orchestrator against the actual worktree files — exact lines confirmed.

| Path | Change |
|---|---|
| `frontend/apps/main/app/api/health/route.ts` | **New.** `dynamic="force-dynamic"`; `GET()` returns fixed literal `{status:"ok", timestamp:<ISO>, uptimeSeconds:<number>}`, 200, `Cache-Control: no-store`, `X-Robots-Tag: noindex,nofollow`. **No env read, no DB call, no version/git/error text.** Omitting a dependency check is deliberate — no slow probe, no raw upstream error to sanitise. |
| `frontend/vitest/health-endpoint.test.ts` | **New.** 2 tests: exact field contract + no-leak regression with a sentinel env var and JWT/framework strings. |
| `main/next.config.ts:6` | `poweredByHeader: false` — stops `x-powered-by: Next.js` at source. |
| `main/next.config.ts:37-38` | `redirects()` → `/community-history` → `/itan-ilu-mi`, `permanent:true` (308, query strings pass through). |
| `admin/next.config.ts:5` | `poweredByHeader: false`. |

**Framework hiding:** both configs + `proxy.ts` audited — no `Server` header, no version/runtime fingerprint. `Access-Control-Allow-Origin` kept (public origin is intentional). **Unhideable without reverse proxy:** `/_next/static/...` paths, RSC markers (`self.__next_s`), Next HTML/route structure — not attempted (would break hydration). **CSP stays report-only** — enforcing without nonce/hash would break inline bootstrap + images.

**Route sweep:** every literal `href=`, `router.push(`, `redirect(` target in both apps checked against the page tree. **No other genuine broken internal target.** Apparent admin gaps are false positives — `adminHref()`/`staffHref()` prepend `/admin` (`admin/lib/admin-path.ts:11,30`).

**Verification (actual output):**
```
vitest health-endpoint.test.ts                  exit 0   2/2 passed
pnpm --filter @epelawa/main typecheck           exit 0   clean
pnpm --filter @epelawa/admin typecheck           exit 0   clean
vitest health + configuration-inventory         exit 0   3/3 passed
tsx --test ui-rebuild.test.mjs                  exit 0   7/7 passed
pnpm typecheck (first attempt)                  exit 2   ENVIRONMENTAL — missing app-level node_modules; fixed by symlinks
pnpm exec vitest run (full suite)               exit 1   28/30 files, 91/92 tests; 2 files FAILED on vitest-pool worker-startup timeouts (30 workers) — NOT a clean pass
route-manifest.test.mjs                         exit 1   PRE-EXISTING — manifest missing 7 routes (/admin/broadcast, /admin/enquiries, /admin/members, /admin/settings, /newsletter/confirm, /support, …). Agent touched none of its inputs.
```
**NOT verified:** live HTTP after deploy, production build, redirect on deployed host, RSC internals.

**Seed/reference rows (follow-up, read-only):** reference seeds **do exist in source migrations** — `20261102190001_capabilities_catalogue.sql:26`, `20261102200008/20261115011000` (`categories`, `authors`), `20261102200011_business_directory.sql:30` (`business_categories`), `20261114190000_configurable_staff_roles.sql:5-7` (roles/capabilities/assignments), `20261121120000_maintenance_mode.sql:9` (`site_maintenance` singleton). The unresolved question is **production application**, governed by the same ledger drift as §4.1 — not missing INSERTs. **No production writes made or proposed** (AGENTS.md §2: production is read-only; no owner approval). Requires read-only production verification + owner sign-off before any forward seed migration.

**Flags:** 🟠 `/api/health` returns **503 in maintenance mode** (`lib/maintenance.ts:2-4` does not exempt it) — may be correct for readiness, Mus'ab's call. 🟠 `poweredByHeader` covers app-emitted headers only; a CDN-injected `Server` header needs proxy control. 🟠 Full suite not green — don't call it verified. 3 extra app-level `node_modules` symlinks are untracked env artifacts — **must not be staged**.

### 4.12 Implementation round 3 — visual upgrade + ticker (designer) — ✅ CODE COMPLETE, UNCOMMITTED

In `/public/EPE-LAWA-VIS` on `feat/visual-upgrade`. Tokens-first upgrade, no new brand, no copied assets.

**Tokens (`frontend/packages/ui/src/tokens.css`, single source of truth):** owner-locked cobalt palette (Midnight `#0A1023` … Border `#293650`); type 1.250 major third 12/14/16/20/25/31/39/49px; space 4px base; **only 8/12/999px radii**, one shadow per elevation; motion 120/200/320ms (+ ad 240ms) with named easings, reduced→`0.01ms`; forms 16px inline / 12px block inset, 48px min control, 44px touch. Glass restricted to dialogs/drawers/popups (10px blur, `.58` scrim, solid `@supports` fallback).

**Ticker (Mus'ab's complaint) — fixed:** Pause button + `paused` state + `.banner:hover` freeze **removed**; `animation:scroll 18s linear infinite` runs on load; `:focus-within .track { animation-play-state:paused }` kept for WCAG 2.2.2; reduced-motion disables animation + makes viewport scrollable; duplicate `aria-hidden` `<ul>` retained for the seamless loop. Label 12px base / **11px floor** ≤520px; SVG bullet replaces `◆`; off-palette hexes → tokens; one of two duplicate `@media` blocks deleted.

**Other:** radio-player off-palette hexes → tokens, `.waveLeft` restored; hero blur/filter + 900ms stagger deleted → 8px/320ms/40ms stagger; sponsor popup `role=status`, 24px/240ms rise, 44px CTA, "Patronise this local business"; footer ad clears cookie notice; SVG arrows in sponsor slot. 17 files changed. No commit.

**Verification — MIXED, environment compromised:** typecheck (main + all workspaces) **exit 0**; ticker unit test **exit 0** (1/1). But `pnpm build` failed `sh: turbo: not found` and the final re-runs failed with empty `typescript/bin` — **the shared pnpm store was rewritten mid-session by concurrent agent installs, so these results are NOT a trustworthy green signal**. `pnpm test:node` = 321/304/17 (agent classified the failures as pre-existing/env: backend schema, source-string drift, `fetch failed` without dev server, `ERR_NO_TYPESCRIPT`, turbo env mismatch — its own 2 failures were fixed, 19→17). Full vitest `--pool=threads` 23 pass/6 fail. Browser smoke + founda-scan **not run** (no browsers / tool not on PATH in that shell). **Orchestrator will re-run everything after repairing the environment — do not treat the visual branch as verified yet.**

### 4.11 Implementation round 2 — audit gate (devops agent) — ✅ COMPLETE, UNCOMMITTED

Spot-checked by orchestrator in `/public/EPE-LAWA-CI` — script present, real scanner output confirmed.

| Path | Change |
|---|---|
| `scripts/audit/run.mjs` | **New.** Dependency-free Node wrapper. Parses `--only=hacking\|ui`, `--fail-on=medium\|high\|critical`, `--json`, `--help`; invalid args exit 2. Runs `founda-scan --json`, parses stdout even on scanner exit 1, fails loudly on invalid JSON. `hacking`=layer 12, `ui`=layers 1/3 + `hardcoded-colour` (scanner has no `--only` flag, so filtering is local). Severity mapping stated in output: scanner has no HIGH tier → `medium`=WARNING+, `high/critical`=CRITICAL. Override binary via `FOUNDA_SCAN_BIN`. |

**Verified output (agent, exact):** `pnpm audit:ci` → CRITICAL 20 / WARNING 166 / INFO 2647, health 76.7, **VERDICT FAIL — 186 findings ≥ medium, exit 1**. `--only=ui` → CRITICAL 0 / WARNING 11, PASS, exit 0. `--json --only=hacking` → CRITICAL 15, exit 1. `--fail-on=critical` → FAIL 20, exit 1. `--only=nope` → exit 2. Nothing suppressed, no fabricated score.

**Decision (mine, from agent recommendation):** CI stays on `pnpm audit --audit-level=high`; **do NOT wire `audit:ci`** — at 186 blocking findings it is permanently red, and `founda-scan` is a global tool, not a declared dependency. Keep it as a **manual local gate**. `ci.yml` left untouched. A `--fail-on=critical` gate still fails today (20 CRITICAL) — add only after triage + tool provisioning in CI.

**Flags:** 🟠 `founda-scan` undeclared — if this gate is ever automated, add it as a devDependency. 🟠 Agent noted 731 files vs the 730 baseline because the wrapper itself is now scanned — expected.

### 4.10 Orchestrator's own live-site checks — ✅ COMPLETE (2026-11-20)

Fetched the production origin `https://epelawa.vercel.app` directly, plus route matrix and headers. Recorded evidence:

**Route matrix (HTTP status via `curl -L`):**
```
200 /                    200 /news                200 /admin
200 /business-directory  200 /radio               200 /map
200 /forum               404 /community-history  ← expected route is /itan-ilu-mi
200 /tourism             200 /who-is-who         404 /api/health  ← no health endpoint
200 /sitemap.xml         200 /robots.txt
```

**Security headers on `/`:**
```
access-control-allow-origin: https://epelawa.vercel.app
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
content-security-policy-report-only: default-src 'self'; base-uri 'self';
  object-src 'none'; img-src 'self' data: https:; frame-ancestors 'none'
permissions-policy: camera=(), microphone=(), geolocation=()
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
x-powered-by: Next.js        ← minor information disclosure
x-vercel-cache: MISS
```
CSP is **report-only**, matching the work list — it does not block anything.

**Security findings from live source:**
- Grepped the full 77,155-byte homepage HTML for `sk_*`, `service_role`, `api_key`, `resend`, `paystack_secret`, `whsec_`, `Bearer …`, and password assignments: **zero matches**. No emails or phone numbers in the SSR payload either.
- Source maps are **blocked**: `/_next/static/chunks/app/page-*.js.map` and `webpack-*.js.map` → `403 text/plain` ✓.
- The inline bootstrap script writes `epelawa-theme` to `localStorage` and has an empty `catch(e){}` — this is the live manifestation of scanner finding `main/lib/theme.ts:8`. Theme preference is not a token, so no token-storage violation, but the swallowed error is real.
- `/admin` renders "Staff workspace | EPE LAWA" — a login surface, not exposed admin data.
- 8 separate CSS files preloaded on the homepage plus multiple JS chunks — bundle-splitting review warranted (layer 11).

**Recommendations from live check:**
1. Add a real `/api/health` endpoint (monitoring layer 13) — currently 404, so no uptime probe can work.
2. Suppress `x-powered-by` in `next.config` (defence in depth).
3. Move CSP from report-only to enforced **only after** the report pipeline is clean — enforcing now would break `img-src` and inline bootstrap script unless nonces/hashes are added.
4. `/community-history` is a 404; if users or external links use that path, add a redirect to `/itan-ilu-mi`.

---

## 5. THINGS DONE WRONG — CONSOLIDATED

Ranked by blast radius. Every line traces to §4 evidence.

| # | What was done wrong | Real consequence | Fix owner |
|---|---|---|---|
| 1 | **Migration ledger drift** — 55 local files vs 42 remote versions, zero filename matches, 2 duplicate timestamps (`20261107213000`, `20261114190000`), no byte-identical files. History was changed without reconciling the ledger. | A `supabase db push` could replay or skip the wrong SQL. 6/8 flagship areas broken live. | Migration agent — forward-only, no bulk replay |
| 2 | **`must_change_password` never defined** — 7 RPCs gate on a column no migration creates (§4.3 MEDIUM-1). | Fresh installs throw; the "change default password first" gate can't be verified. Fail-closed, so no bypass. | Forward migration after live check |
| 3 | **Newsletter unsafe RPC still exposed live** — local pause migration `20261118053000` not deployed; anon execute on `newsletter_subscribe_request` token-replacement path. | Anonymous token replacement. UI gated off, but the RPC is a live surface. | Deploy pause migration (security-sensitive — Mus'ab's call) |
| 4 | **Member-delete audit written before effect** (`member_admin_messages.sql:42-44`) + no R2 cleanup + unapplied. | A failed delete leaves a false `success` audit; orphaned avatars. | Redesign before ever applying — data deletion |
| 5 | **CI is decorative** — `main` unprotected (`protected:false`), PR #191 merged with red checks, last 20 runs = 16 fail / 4 cancel / 0 success. 10 unit + 9 smoke failures. | Broken code ships to preview and can reach prod; no mechanical gate. | Devops + fix failing tests |
| 6 | **Audit gate is dead code** — 4 `audit*` scripts in `package.json:20-23` point to missing `scripts/audit/run.mjs`. CI calls `pnpm audit` directly, so the custom gate never executes. | Documented "security gate" is imaginary. | Implement or delete the 4 scripts |
| 7 | **CSP report-only** on both apps — zero XSS containment, `img-src https:` broad. | No defence if an XSS lands. | Collect reports → enforced with nonce/hash (gated) |
| 8 | **`x-powered-by: Next.js`** still emitted; no `/api/health`. | Framework fingerprint leaked; no uptime probe possible. | ✅ **Fixed in `security/headers-health` worktree, uncommitted** — §4.9 |
| 9 | **Form inset tokens are dead** — 16px tokens written inside `:where(form) :where(...)` at specificity 0,0,0; component rules win. Inputs at 8px (≤360px), 10px (≤320px), hints at 10.5px. §4.6 has 22 file:line cases. | The exact complaint Mus'ab raised — text hugging the border — is real and widespread. | Design/token PR |
| 10 | **Radius/colour drift** — 6 radius values vs locked 2–3; **404 hardcoded hex** values; parallel token system in `ui/src/tokens.css` with names like `--ep-ui-lilac`. | Inconsistent UI, no single source of truth. | Design token PR |
| 11 | **`overflow-x:hidden` band-aid** at `navigation-refinement.css:85` on `.site-main` ≤767px. | Hides the real overflow bug instead of fixing it; can clip focus rings and sticky elements. | UI fix |
| 12 | **Ticker label 9.3px on mobile** (`.58rem`), two duplicate `@media` blocks, off-palette `◆` glyph and red/gold colours. Also a visible Pause button **and** `.banner:hover .track` freezing the scroll. | Unreadable, breaks palette/icon rules, and the banner stops while the pointer rests on it — Mus'ab's "not playing" complaint. | ✅ Fix dispatched to visual agent: remove button + `paused` state + hover-pause; keep `:focus-within` pause for WCAG 2.2.2 and reduced-motion fallback |
| 13 | **Sponsor CTA is plain text** (`.action`, 36px target), popup is a static corner card with no upward rise, and the home slot sits flush above the cookie banner. | Weak business patronage CTA; banner blindness makes both get ignored. | Ad PR |
| 14 | **Radio card has duplicate CSS rule blocks** (`:1-7` vs `:23-36`) and no documented height budget. | Maintenance trap; "reduce height" can't be verified against a target. | Radio PR + write the budget |
| 15 | **`.env.example` missing ~15 runtime names**, plus `VAPID_PUBLIC_KEY` vs `NEXT_PUBLIC_VAPID_PUBLIC_KEY` mismatch. | Deployments fail with undefined config; docs lie. | Devops/env PR |
| 16 | **Two staff capability paths** (`has_capability("admin.access")` and `staff_roles_authorized()`) with contradictory comments across migrations. | Effective gate unverified; single hard-coded owner email in a "configurable roles" design. | Migration reconciliation |
| 17 | **4 phone-shaped JPEGs committed** to history, staged-deleted but still in HEAD; visual content never reviewed. | Potential PII in every clone. | Mus'ab visual review → purge if needed |
| 18 | **CI Actions pinned to major tags**, not commit SHAs; smoke workflow ignores missing evidence (`if-no-files-found: ignore`). | Upstream changes land unreviewed; missing proof passes silently. | Devops |
| 19 | **~33 historical commits with no PR association** (mostly pre-#131 bootstrap). | Past PR-rule violations; recent 60 entries are compliant. | Historical — note only |
| 20 | **`pnpm-workspace.yaml.bak`** leftover; stale `docs/14-tracker.md:12` still calls a withdrawn advisory a blocker. | Confusion, false blockers. | Cleanup |

## 6. HALF-BAKED CODE / FEATURES / WIRING

**Dominant pattern: code-complete / integration-incomplete.** The team wrote real DB calls, fail-closed gates and honest error states — no fabricated content anywhere — but never reconciled the production schema. Result: **at least 6 of 8 flagship areas cannot work live.**

| Area | State | What's half-done |
|---|---|---|
| News | BROKEN live | `cover_url` SELECT throws 42703 — defining migration not in ledger. Featured-story workflow open; breaking/featured/card duplication unresolved; Discover visual parity open. |
| Itan Ilu Mi | BROKEN live | `history_*` tables + `history.review` capability absent. Correction requests honestly "Unavailable". |
| Forum | BROKEN live (polls) | `forum_poll_*` tables absent; `forum_vote` can't run alone. |
| Business Directory | BROKEN live | `businesses/products/orders/...` absent; 2 RPCs exist only in an explicitly non-deployable candidate file. Phase 1 discovery redesign only. |
| Tourism | BROKEN live | `tourism_*` tables + `tourism.review` capability absent. |
| Who Is Who | PARTIAL | Reads work; staff write RPCs (`people_update`, `people_verify`) absent live. |
| Radio | near COMPLETE | Streams verified, compact player in source. Rights/schedules/archive open. Guts FM provider lookup previously failed. No measurable height target. |
| Map | COMPLETE | Safe outbound Google Maps URLs only — the one finished area. |

**Cross-cutting half-wiring:**
- **20 admin shims** re-export the standalone admin app; layouts cross-import. Any admin change must be made in `frontend/apps/admin`, not the shim.
- **Newsletter** — UI gated off but live RPC exposed (§5 #3). Confirm/unsubscribe code real but untested with a real inbox.
- **Contact / corrections / advertising / support intake** — all gated off; contact page honestly says "No message is received". Support issues a ticket number but is **not** a ticketing system.
- **Maintenance gate** — migration applied, `MAINTENANCE_GATE_ENABLED=false`; Vercel activation + E2E outstanding.
- **Member messaging/deletion candidate** — unapplied; direct `auth.users` deletion, no Storage cleanup, no idempotency, 10,000-recipient cap. Do not enable.
- **Payments** — env keys and schema constraints present, but no runtime handler by design. Sponsorships cannot activate without a webhook. Correctly not claimed as working.
- **Auth** — full code (OTP, recovery, redirect allowlist, mail-hook signature verification), but provider delivery and real browser staff login unverified. Custom mail-hook cutover deferred.
- **Admin analytics** — real counts only; graphs/real-time/country metrics explicitly not built.
- **6 deliberate "Coming Soon" affordances** — Google sign-in ×2, contact, newsletter, secure report, About badge. Honest, not fake.
- **Storefront** — entirely missing: no auto-slug, no owner mini-admin, no profile-picture upload, no X/Telegram/Facebook badges, no premium subscription. Handoff says so explicitly.
- **Test gaps** — no E2E against live catalog, no real member/staff login test, no Playwright for the 8 feature areas, no live newsletter-RPC-revocation test. All DB tests are PGlite with simplified schemas — that is exactly why drift went undetected.

## 7. UX LAWS APPLIED TO THIS PRODUCT

Full 26-law table with sources is in §4.5. This section is the **verdict** — where the code breaks a law, and the concrete fix.

| Law | Verdict | Evidence / fix |
|---|---|---|
| **Proximity** *(your "text too close to border" complaint)* | **FAIL** | NN/g: label must be closer to its input than to any other item, including the container border. Here the inset is 8–14px while the label gap is 4px — the eye groups text with the border. Fix: inset 16px, label gap 8px, via an explicit `.ep-control` class — NOT a zero-specificity `:where()` rule. 22 cases in §4.6. |
| **Closure** | **FAIL** | Home story list and hero carousel show no next-card peek. Only `dashboard.module.css:338` does it right. Fix: `grid-auto-columns:minmax(0,68%)` + `scroll-snap-align:start`. **32% is a design decision, not a sourced law** (§4.5). |
| **Figure–Ground** | **PARTIAL** | Dialogs/scrims .58/.56 ✓; staff drawer **.48 too weak** → raise ≥.56. One thing must dominate. |
| **Banner Blindness** | **FAIL** | Home sponsor slot at `page.tsx:111` sits flush above the cookie banner at `:112`; both are shadowed cards. Separate by ≥1 section; give notices a solid left accent, no dashed/gradient ad treatment. |
| **Connectedness** | **FAIL** | Enquiry form has the connecting-line stepper (`globals.css:419`); business and editor forms use a bar only. Reuse the connected markup. |
| **Parkinson's** | **PARTIAL** | Auth/enquiry/profile have autocomplete; order/business/tourism/history forms don't. Add standard `autoComplete` tokens (postcode lookup beats typing an address). The "30 keys → 7 keys" example is **unsourced** — do not quote it as law. |
| **Choice Overload / Hick's** | **FAIL** | Home first fold: hero CTA + radio CTA + 6 shortcuts + community CTA + popup + bottom nav = 10+ competing choices. Jam-study numbers (24→6 options, 3%→30% purchase) **are verified** (Iyengar & Lepper 2000). Fix: cut shortcuts to 3–4, group categories. |
| **Fitts's** | **FAIL** | 36px sponsor link, 36px file button, 40px footer/comment-delete controls. 44×44 is verified but **WCAG 2.1 AAA**, not AA (2.2 AA is 24×24). We keep 44 as a locked project standard — just don't mislabel it. |
| **Good Continuation / Common Fate / Similarity** | MIXED | Stepper line exists in one form only; animations not grouped by meaning; ~404 hardcoded colours break Similarity (one treatment per meaning). |
| **Peak–End / Aesthetic-Usability** | **AT RISK** | No explicit success handoff after submit in several flows; hero carousel has no image `onError` or empty state. A broken-looking state destroys trust in an otherwise honest product. |
| **Doherty (<400ms)** | UNMEASURED | No latency budget recorded. The new health endpoint targets <400ms; add real timing for search/RPC calls. Verified figure (IBM 1982), not a biological constant. |
| **Jakob's** | **PASS** | Cart-style conventions, standard nav, safe back-button behaviour, familiar auth forms. Don't over-innovate here. |

**Rule for the report:** qualitative laws are citable; the specific numbers 48px/32% peek, 70% scrim, and 30→7 keys are **project decisions**, not law-derived facts. Don't present them as research in client docs.

## 8. PHASED PLAN TO FINISH THE WEBSITE

Mobile app is **OUT OF SCOPE** until Phase 8 passes. Fix order inside phases follows the standard: `7 → 12 → 3 → 2 → 8 → 6 → 4 → 5 → 9 → 10 → 11 → 13`.

**Phase 0 — Contain + harden (IN PROGRESS, no commit).** Health endpoint, framework header removal, dead-route redirects, framework-leak audit. *Done:* agent returns verified files + green typecheck + tests, changes uncommitted on `security/headers-health`, reviewed via PR.

**Phase 1 — Database reconciliation (the blocker for 6/8 areas).** Read-only object inventory of production; confirm backup exists **and has been restored once**; resolve the ledger drift with forward-only migrations; create missing tables + **safe reference rows** (roles/capabilities, ad slots, categories); add `must_change_password`; verify `staff_roles_authorized()` live; reconcile duplicate timestamps. *Done:* drift explained, backup rehearsal signed off, no bulk replay, migration PR mergeable, then live object check. **Auth / data-deletion migrations (newsletter pause, member delete) need Mus'ab's explicit call.**

**Phase 2 — Security closure.** Deploy the newsletter pause RPC; redesign member-delete (audit after effect, Storage cleanup) and leave unapplied until reviewed; collect CSP reports then enforce with nonce/hash; visual-review the 4 JPEGs; wire `checkBrowserMutation`; schedule retention purge; track the picomatch CVE note; restore/deploy branch protection on `main` (requires repo public or GitHub Pro — client decision). *Done:* no CRITICAL open, CSP enforced without breakage, no PII in history.

**Phase 3 — CI/CD green.** Fix 10 unit failures + 9 smoke failures across 320/375/768/1024/1440; implement or delete `scripts/audit/run.mjs`; complete `.env.example`; update `docs/14-tracker.md`; pin Actions to SHAs; make missing smoke evidence fail. *Done:* `pnpm typecheck`, `pnpm build`, `pnpm test`, browser smoke and audit all green on the exact PR head **and** post-merge `main`, with all contexts required before merge.

**Phase 4 — Design system + forms + ads.** Land the tokens from §4.6 (radius 8/12/999, control inset 16/12, min-height 48, field gaps, touch 44, one focus ring, one overlay); replace the zero-specificity form override with `.ep-control`; fix all 22 spacing cases; chunk long forms with connected steppers; sponsor popup rise from bottom + 2s countdown + close-now, real 44px CTA, stronger "patronise business" copy; two home slots kept but separated from cookie banner; radio card compact + height budget documented; ticker label ≥11px with SVG icon, palette hexes; remove `overflow-x:hidden`. *Done:* 320/375/768/1024/1440 matrix + keyboard + reduced-motion + contrast all pass, scanner radius/colour counts drop.

**Phase 5 — Feature completion.** Newsroom featured-story workflow + dedup + Discover parity; real inbox tests for newsletter/contact/support/advertising; staff queue + Gmail notices + durable ticket tracking; auth OTP/recovery/staff browser tests; Guts FM stream verification + rights; other areas (Itan Ilu Mi, forum, tourism, Who Is Who) end-to-end after Phase 1. *Done:* each area passes a real production workflow, not a PGlite stub.

**Phase 6 — Storefront (after schema stable).** Auto-slug `epelawa.vercel.app/Epe-lawa`; owner mini-admin in dashboard; profile-picture upload with MIME/size/path validation; editable business info; **verified X/Telegram/Facebook badges**; premium subscription with server-verified webhooks and idempotency. *Done:* schema + RLS + storage policies + webhook verification reviewed; no fake badges, no client-trusted payment status. **Flag: auth, payment and data-deletion paths — all three present here.**

**Phase 7 — Content, legal, release.** 15 real sourced articles with bylines/image rights; business photos/hours; privacy/terms/moderation/retention/Nigerian legal review; domain/DNS/TLS; Vercel dashboard config audit; report-only CSP review; exact deployed SHA recorded; error/uptime monitoring. *Done:* full route × role matrix at all five widths, all states (loading/empty/denied/error/success/provider-failure), prod smoke on the real domain.

**Phase 8 — Only then mobile.** Native app work opens after every above phase has link-backed evidence, not claims.

## 9. WHAT ONLY YOU OR THE CLIENT CAN DO

1. **Visual-review the 4 JPEGs** in git history (I cannot render images). If they contain member/staff data → authorise `git filter-repo` purge — destructive history rewrite, your explicit call.
2. **Real credentials** in Vercel for every env name in §4.8 — never in the repo, never pasted to me.
3. **Live inbox tests** — newsletter confirm/duplicate/unsubscribe, contact, advertising, corrections, support, Gmail notifications and acknowledgements.
4. **Authorized staff account** — browser login, role changes, capability revocation, article publishing, breaking flags. Local tests are not proof.
5. **Real content** — the 15 articles (dates, claims, sources, bylines, image rights), real business data/photos/hours, tourism records, Who Is Who profiles. I will not invent any of it.
6. **Backup + restore rehearsal sign-off** — confirm a real production backup exists and has been restored once before any migration PR merges.
7. **Security-policy decisions** — deploy the newsletter pause RPC; approve any member-deletion design; decide CSP enforcement timing; decide repo public vs GitHub Pro for branch protection.
8. **Payments provider** — Paystack sandbox keys, webhook signing secret, idempotency review before enabling anything. Currently off by design.
9. **Guts FM** — stream rights, availability, schedule, archive behaviour; provider lookup previously found no match.
10. **Legal review** — privacy, terms, moderation, retention, image rights, Nigerian jurisdiction.
11. **Vercel dashboard** — build command, root, domains, redirects, CORS/callback URLs, cron protection, storage permissions, rate limits, monitoring. Not in the repo and not inspected.
12. **Domain/DNS/TLS** if a custom-domain launch is intended.
13. **Arena transcript** — login-gated; give me credentials or paste the text if you want that source incorporated. Nothing in this report derives from it.
14. **Final merge call** — the vote/recommendation is not the decision; you decide when to merge each PR.

## 10. PR / DEPLOYMENT STATUS

- **No open PRs** (`gh pr list --state open` → `[]`). Current `main` = `49bf9d8`, CI **red**, branch **unprotected**.
- **Nothing committed by me.** Three isolated working trees, all off `49bf9d8`, all hand back uncommitted:
  - `/public/EPE-LAWA` on `fix/migration-reconciliation` — migration agent; only the recon doc is untracked.
  - `/public/EPE-LAWA-SEC` on `security/headers-health` — ✅ **code complete, uncommitted**: health endpoint + `x-powered-by` removal in both apps + `/community-history` 308 redirect + tests (§4.9).
  - `/public/EPE-LAWA-VIS` on `feat/visual-upgrade` — full visual upgrade in progress: tokens, motion system, glass/backdrop modals, form spacing, ad/branding polish, **plus breaking-ticker fix** (remove Pause button + hover-freeze, keep `:focus-within` pause for WCAG 2.2.2). Dispatched because Mus'ab asked for it while the other agents work.
- **Visual upgrade guardrail:** the master standard bans excessive glassmorphism/glow/gradients/decorative motion. The brief requires purposeful blur (Figure–Ground), transform/opacity-only motion, `prefers-reduced-motion` on every animation, ≤3 radii and tokenised colour — not a generic AI look.
- **4 root `.jpg` files** are staged-deleted in the main tree — not by me, and intentionally untouched in the worktree. Account for them before any integration PR.
- **Green Vercel contexts ≠ production.** #183/#182/main show Vercel success on **preview** branches while CI/smoke failed. No GitHub Deployments promotion records exist.
- **Manual gate is the only gate** (`protected:false`). PR rule: every fix via feature branch → PR → all contexts green + review → merge → rerun checks on `main`. Do not repeat #191 (merged with red checks).
- **Delivery target:** GitHub shows all required contexts success, Vercel shows a successful production deployment on the exact release SHA, and the PR is fully mergeable — before you call any phase done.

#### PR consolidation plan (locked — all 6 worktrees share one `.git`)
All branches are at the same base `49bf9d8`; consolidation into one feature branch is conflict-safe by construction. Ordered task list for the integration branch (name per repo AGENTS.md §5: `feat/full-web-implementation`):

| # | Source branch | Content | Gate before merge into integration |
|---|---|---|---|
| 1 | `security/headers-health` | Health endpoint, `x-powered-by: false`, 308 redirect | focused tests + typecheck green (done §4.9) |
| 2 | `fix/ci-audit` | `scripts/audit/run.mjs` | wrapper verified, real counts (done §4.11) |
| 3 | `fix/migration-source` | forward `must_change_password` migration | `schema.test.mjs` exit 0 from scratch |
| 4 | `fix/test-green` | test/harness fixes | `pnpm test` + `test:unit` exit 0 |
| 5 | `feat/visual-upgrade` | tokens, motion, glass, ticker fix | typecheck + vitest + build exit 0 |
| 6 | `fix/migration-reconciliation` | recon doc only (untracked) | docs-only, no conflict |

**Excluded from integration:** the 4 staged-deleted root `.jpg` (not mine — leave out of PR until manually reviewed), 3 untracked app-level `node_modules` symlinks (env artifacts — never stage).

**Merge gate for integration → main (all must be true):**
1. `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm test:unit` exit **0** on the exact integration head, freshly run (not cache-only for build).
2. Browser smoke public config green on 320/375/768/1024/1440 (install Playwright Chromium if needed).
3. `founda-scan --json` re-run; CRITICAL count not increased by these changes.
4. Push integration branch → open PR → **all GitHub contexts + Vercel preview green** on the PR head.
5. Only then merge to `main`; rerun full verification on post-merge `main`. If any gate fails, **no merge** — report the exact failure instead.

---

## 11. CONFLICT RECONCILIATION (orchestrator decisions)

Two specialists disagreed. I decided; these are not passed down as open questions.

| Conflict | Positions | Decision + why |
|---|---|---|
| **Is there a live high-severity picomatch vulnerability?** | Devops: `GHSA-fc5q-39xc-vjpf` **withdrawn** 2026-11-18, `pnpm audit` clean, OSV `{}`, Dependabot 0 → PASS. Security: `CVE-2026-112366` ReDoS CVSS 8.7, no fix published, upstream issue `#247` open (updated 2026-11-18) → LOW/open. | **Treat dependency gate as PASS** — the authoritative npm signals (`pnpm audit`, GitHub Advisory withdrawal, OSV, Dependabot) all agree, and the transitive path is build-time only (`tinygloppy → fdir → picomatch`), not runtime-reachable from user globs. But **keep the CVE claim as an open researcher note** and re-check next audit; it may be an unpublished/pre-print ID for the same withdrawn issue. Do NOT remove the `pnpm audit` gate. |
| **Local migration file count** | My own `ls \| wc -l` = 55. Explore specialist + handoff docs = 52. My `supabase migration list` = 42 remote versions. | **RESOLVED by migration agent** — 55 local files classified APPLIED 34 / NOT APPLIED 12 / UNKNOWN-BROKEN 9; per-file table in `docs/reconciliation/2026-11-20-migration-reconciliation.md`. All three earlier numbers were different denominators signalling the same drift. No DDL applied. |
| **RadioPlayer Vercel failure** | Handoff `2026-11-20-migration-inventory.md:75` records a failed deployment for `585566e`. Explore: source at `radio-player.tsx:10` now accepts `children?: ReactNode`, so the TS cause is fixed. | **Source fixed, deployment UNVERIFIED.** Devops found the recorded failing run (`44688075730`) but no later green build proof. Do not claim shipped until a successful build on a specific SHA is recorded. |
| **"24 laws"** | The pasted Part 4 material presents 24 laws with numeric claims. Research: 26 distinct named laws across sources; only jam-study numbers and 400ms are source-backed. | Use the 26-law table in §4.5; treat 48px/32% peek, 70% scrim and 30→7 keys as **project decisions**, not law-derived facts. |
| **`staff_roles_authorized()` exists in production?** | `configurable_staff_roles.sql:1` claims applied; `private_enquiry_staff.sql:2` claims absent. Pentester: unverified. | **RESOLVED by live query — it EXISTS** (`pg_proc` count 1, zero-arg). The SQL comment is stale. Single hard-coded owner email coupling still stands. |
| **`must_change_password` missing?** | Pentester: 7 RPC refs, 0 definitions → "cannot be verified from source"; handoff claims production has it. | **RESOLVED by live query — production HAS it** (`information_schema` count 1). Real gap is **source reproducibility**, not production. Forward column would be a production no-op. |
| **Admin member-delete "ready"?** | UI calls `admin_member_delete` (`members/actions.ts`); migration has no remote ledger name and is flagged unsafe (`inventory.md:28,71,81`). | **Feature is broken/unapplied, not safely live.** Do not enable. Audit-before-effect bug (§4.3 MEDIUM-3) must be fixed first. Data-deletion path — explicit flag to Mus'ab. |

---

## 12. DOCS READING LIST (what to read, in this order)

Verified against the actual `docs/` tree — every path below exists. Read **Tier 1** before you sign the merge; the rest are reference.

**Tier 1 — read before you merge (decision-critical)**
| File | Why |
|---|---|
| `AGENTS.md` (repo root) | Owner-locked rules: 8 web areas in scope, no false claims, never rewrite historical migrations, PR + merge-only-after-green gate, cobalt palette, SVG icons. |
| `/public/EPE-LAWA-MASTER-AUDIT.md` | This report — findings, decisions, risks, phases. |
| `docs/reconciliation/2026-11-20-migration-reconciliation.md` | Per-file DB drift (55 files: 34 applied / 12 not / 9 broken). **The single most dangerous area** — read before any DB action. |
| `docs/14-tracker.md` | Live status tracker — **stale**: still lists withdrawn `picomatch` advisory as a blocker (§4.8). Fix before release. |
| `docs/handoffs/2026-11-18-continuation-next-steps.md` + `docs/handoffs/2026-11-18-migration-reconciliation-status.md` | The handoff this audit was asked to verify. |
| `docs/17-owner-requirements-checklist.md` | Owner requirements vs current state. |

**Tier 2 — product / architecture (understand what you are shipping)**
| File | Why |
|---|---|
| `docs/00-master-plan.md` · `docs/01-product-requirements.md` | Scope + source of truth (AGENTS.md names these as required reading). |
| `docs/02-user-journeys.md` · `docs/03-sitemap.md` · `docs/04-page-specifications.md` | Journeys, routes, page specs. |
| `docs/06-system-architecture.md` · `docs/07-database-schema.md` · `docs/08-permissions-security.md` · `docs/09-api-contracts.md` | Architecture, schema, authz model, RPC contracts. |
| `docs/05-design-system.md` · `docs/18-full-ui-redesign-phase-plan.md` | Locked tokens/palette + the visual roadmap (ties to the visual agent's work). |

**Tier 3 — the risky / unfinished areas (read before enabling those features)**
| File | Why |
|---|---|
| `docs/handoffs/2026-11-form-sponsor-storefront.md` | Storefront is **explicitly not built** — owner mini-admin, badges, premium subscription all missing (§4.6). |
| `docs/handoffs/2026-11-business-directory-repair.md` · `docs/handoffs/2026-11-member-messaging-draft.md` | Business flow repair + member messaging/deletion **not release-ready** (§4.4 #8). |
| `docs/handoffs/2026-11-maintenance-mode.md` · `docs/handoffs/2026-11-15-canonical-admin-build-cache-inputs.md` | Ties directly to 2 open test failures (maintenance `server-only`, `MAINTENANCE_GATE_ENABLED` cache input). |
| `docs/16-schema-runbook.md` · `docs/schema-audit.md` | Safe DB procedures — read before any forward migration. |
| `docs/10-integrations.md` · `docs/11-testing-acceptance.md` · `docs/browser-smoke.md` | Provider status (Paystack/Guts/email **not live**) + how acceptance/smoke are meant to run. |

**Do NOT treat as current truth** — archive/historical snapshots: everything under `docs/archive/`, and the older `docs/handoffs/2026-11-1x-*` files whose claims this report supersedes. They are factual history, not active scope (AGENTS.md §8).

**One-line doc task list for release:** update `docs/14-tracker.md` (withdrawn advisory, green statuses), align `docs/handoffs/...` claims with the reconciliation, complete `.env.example`, and add a README note for `/api/health`. Full details in §5, §9, §10.

---

*Report consolidated 2026-11-20. Migration reconciliation ✅, browser secret scan ✅, full-history secret scan ✅, broad pentest ✅, UX research ✅, UI/UX audit ✅, CI/Vercel audit ✅, orchestrator live checks ✅, health/headers implementation ✅ (uncommitted), QA local build/test ✅. **Still outstanding:** visual-upgrade agent (incl. breaking-ticker fix), seed/reference-row follow-up, and the Round-4 decisions from Mus'ab. Nothing committed; no PR opened. Last updated: 2026-11-20 (device clock).*
