# EPE LAWA — SINGLE SOURCE-OF-TRUTH EXECUTION CHECKLIST

Compiled 2026-11-20 from `/public/EPE-LAWA-MASTER-AUDIT.md` (970 lines, audited commit `49bf9d80ef50afb119d6f2a415b72e864696eee0`). That report is the read-only evidence ledger. This file is the operative checklist. Do not edit the source report.

Status key:
- `[x]` = DONE. Named evidence is recorded on the line.
- `[ ]` = NOT DONE. Requires verification before it can be checked.
- `NEEDS OWNER DECISION` = stop and ask. Never guess.
- `OWNER/CLIENT ONLY` = agents must not action. See Phase 9.

Reconciliation with the repo state after the remediation PR and PR #192: already merged and marked `[x]` here with evidence are the health endpoint, `poweredByHeader:false`, `/community-history`→`/itan-ilu-mi` 308, restored `scripts/audit/run.mjs`, forward migration `20261119013500_staff_profiles_must_change_password.sql`, forward migration `20261119105000_published_articles_body.sql`, forward migration `20261121130000_site_maintenance_updated_at_trigger.sql`, stale test assertions/harness fixes including vitest `isolate:true`, tokens-first visual upgrade (glass/motion/sponsor/radio/ticker with keyboard-focus and reduced-motion retained), and the migration reconciliation doc. PR #192 merged to `main` at merge commit `05efaf5` / head `1f6f6aa`. Still NOT done: browser smoke (Playwright; CI installs Chromium) and GitHub CI contexts, both deferred by the developer to the project end. founda-scan still reports 20 CRITICAL / 166 WARNING (heuristic evidence, not a type checker). No production DDL, writes, or seeds were ever applied.

---

## AGENT DIRECTIVE — READ FIRST

Copy-paste this prompt at the start of every new agent session on this project:

```text
You are working on the EPE LAWA web platform (repo epelawa/EPE-LAWA, Next.js web app + Supabase backend). docs/EXECUTION-CHECKLIST.md is the SINGLE SOURCE OF TRUTH for this work. /public/EPE-LAWA-MASTER-AUDIT.md is the read-only evidence ledger it was compiled from. Read this checklist fully before acting.

Rules you must obey:
1. Work strictly in phase order. Do not start a later phase until the current phase's exit condition is met with evidence. Do not invent work, re-litigate locked decisions, or divert to tasks not listed here. If you believe something is missing, report it as "MISSING" and stop; do not action it.
2. Mark a checkbox [x] ONLY with NAMED EVIDENCE on the same line: the exact command plus its exit code, or a verified file:line. "Should work", "looks fine", and unsourced claims are not evidence. Never mark a NEEDS OWNER DECISION or OWNER/CLIENT ONLY item complete.
3. Never commit or push directly to main. Every change goes to a feature branch, then a PR. All required GitHub contexts and the Vercel preview must be green before merge, then rerun verification on post-merge main.
4. MODE SWITCH (owner, 2026-11-20): the audit/read-only phase is OVER; this is now FULL EXECUTION. Agents implement real fixes (code, CI, docs, tests, non-irreversible migrations) and verify them, not just record findings. HOWEVER the irreversible paths remain owner-gated and are NOT authorised by this mode switch: production DDL/writes/seeds/test data, `admin_member_delete` or any data deletion, payments/money-table changes, and Vercel access (O1). For any of those, stop and get the specific owner decision; do not guess. Production read-only query/GET verification is still the default for checking live state until an owner authorises a write.
5. Before touching any auth, payment, money-table (kobo / order / payment / subscription / sponsorship), or data-deletion path, explicitly flag it in your response, name the file:line, and stop until the owner decision is recorded. Payments and member deletion are OFF by design.
6. Scope all 13 production layers for every change: UI, responsive, accessibility, performance, slow connections, state/leaks, error boundaries, loading states, offline, animation performance, bundle size, security, monitoring.
7. Run founda-scan and report the REAL output (CRITICAL / WARNING / INFO, health, readiness, layers flagged, VERDICT). Never fabricate, suppress, or round a score. The scanner is heuristic evidence, not a type checker; tests and human review still decide. Do not run founda-scan --fix (the audit found nothing mechanically safe to auto-fix).
8. Keep docs in sync: whenever code, env vars, routes, or scripts change, update the matching doc in the same PR, including .env.example, docs/14-tracker.md, handoffs, and the README note for /api/health. One source of truth per fact.
9. If an item is marked NEEDS OWNER DECISION or OWNER/CLIENT ONLY, stop and ask. Do not guess and do not pick a "safe default" and proceed. Vercel deployment access for git author Brave290 is an owner-only access blocker; do not attempt to bypass it.
10. Native mobile is OUT OF SCOPE until the website release gate passes. Do not start mobile work.
```

---

## DECISIONS NEEDED FROM OWNER

Nothing in this section may be actioned by an agent. Each item states what must be decided, why it blocks work, and the default safe behaviour until decided.

### Owner decision O1 — Vercel deployment access for git author `Brave290` (NEW, active blocker)

- [ ] **Decide and grant Vercel project/team access to git author `Brave290`.** What: PR #192 (merge `05efaf5`, head `1f6f6aa`) has `Vercel` → FAIL with exact message "Git author Brave290 must have access to the project on Vercel to create deployments." (link points to a Vercel team-invite URL). Why it blocks: no Vercel deployment can be created from that author, so the required green Vercel context on a PR head and the production deployment on the exact release SHA cannot be produced; this is an ACCESS/CONFIG blocker, not a code failure. Default safe behaviour: treat Vercel as BLOCKED, do not bypass, do not re-author commits to change the author, do not claim deployment evidence. Source: task context PR #192 check results; §4.8 "green Vercel contexts ≠ production"; §8 Phase 7; §10 delivery target. Done: owner confirms access granted and a new Vercel context result is green on a named SHA.
- [ ] Keep the `Vercel Preview Comments` pass and `Supabase Preview` skip on record but do not treat them as deployment proof — source: task context PR #192 check results / §4.8 deployment evidence table; done: final gate table records `Vercel` as the required context, with PASS/FAIL and SHA.

### Owner decision O2 — Maintenance-mode 503 health behaviour

- [ ] Decide whether `/api/health` should return 503 during maintenance mode (readiness semantics) or 200 with a maintenance field. What: `lib/maintenance.ts:2-4` does not exempt `/api/health`. Why it blocks: uptime/error-rate monitoring semantics depend on it; changing it alters the endpoint contract. Default safe behaviour: leave unchanged (503 in maintenance) and do not add an exemption. Source: §4.9 flag / §8 Phase 7 monitoring. Done: owner decision recorded, then endpoint contract test updated if changed.

### Owner decision O3 — `admin_member_delete`: drop or redesign (BLOCKING)

- [ ] Decide drop vs redesign of `admin_member_delete`. What: the RPC hard-deletes `auth.users`, writes audit `'success'` before the effect at `member_admin_messages.sql:42-44`, leaves R2 avatar orphans, has no remote ledger name (`inventory.md:28`), and flags unresolved Auth/Storage/idempotency risk (`:71,81`). Why it blocks: the admin UI calls it (`members/actions.ts`) so the feature is broken/unapplied rather than safely live; it is a data-deletion path and must not be enabled by an agent. Default safe behaviour: leave unapplied and disabled. Source: §4.1 decisions #1 / §4.3 MEDIUM-3 / §5 #4 / §6 / §8 Phase 2 / §9 #7 / §11 row 7; done: written owner decision plus reviewed migration, still unapplied until signed off.

### Owner decision O4 — `must_change_password` clearance RPC

- [ ] Decide whether an explicit audited clearance RPC is needed. What: production HAS the column (`information_schema` count 1), forward migration `20261119013500_staff_profiles_must_change_password.sql` is merged for source reproducibility, and no clearance RPC was added. Why it blocks: adding one changes the staff auth surface. Default safe behaviour: no clearance RPC. Source: §4.1 decisions #2 / §4.3 MEDIUM-1 / §11 row 6; done: owner decision recorded.

### Owner decision O5 — Branch name, money schema scope, `btree_gist`, ledger strategy, apply authorisation, storage state

- [ ] Decide all six items from the backend specialist's list. What: integration branch naming (`fix/…` vs `feat/full-web-implementation`), whether any money schema is in scope, `btree_gist` use, migration ledger strategy, who authorises production applies, and storage policy state. Why it blocks: forward migration design and PR structure depend on these; §10 locks `feat/full-web-implementation` as the integration name pending repo AGENTS.md §5. Default safe behaviour: `feat/full-web-implementation`, no money schema, no `btree_gist`, forward-only ledger strategy, no production applies, storage baseline defined before uploads. Source: §4.1 decisions #3 / §10; done: owner decision recorded.

### Owner decision O6 — Reference/seed row production application

- [ ] Decide whether to apply reference/seed rows to production. What: seeds DO exist in source (`20261102190001_capabilities_catalogue.sql:26`, `20261102200008/20261115011000` categories/authors, `20261102200011_business_directory.sql:30`, `20261114190000_configurable_staff_roles.sql:5-7`, `20261121120000_maintenance_mode.sql:9`), but production application is unresolved under the same ledger drift; the earlier "missing rows" list was never delivered as a confirmed inventory. Why it blocks: the owner mandate says create missing tables and rows, but writing seeds to production is forbidden without explicit sign-off. Default safe behaviour: no production writes; keep the open gap recorded. Source: §4.1 seed inventory / §4.9 seed follow-up / §3 #2; done: owner decision plus read-only production inventory.

### Owner decision O7 — Newsletter unsafe RPC deployment

- [ ] Decide whether to deploy the newsletter pause RPC. What: local `20261118053000_pause_unsafe_newsletter_signup.sql:5` is NOT deployed; `20261118030000_newsletter_subscriptions.sql:39,100` grants anon execute on a token-replacement path. Why it blocks: security-sensitive production change; UI is gated off but the RPC is a live surface. Default safe behaviour: leave as-is, record as open CRITICAL-class risk. Source: §4.4 feature #13 / §5 #3 / §6 / §8 Phase 2 / §9 #7 / §4.8 superseded statement; done: owner decision recorded before any deploy.

### Owner decision O8 — CSP enforcement timing

- [ ] Decide when to move CSP from report-only to enforced. What: `main/next.config.ts:18`, `admin/next.config.ts:16` are report-only; no nonce/hash strategy and no `script-src` declared. Why it blocks: enforcing now breaks inline bootstrap and images. Default safe behaviour: keep report-only, collect reports first. Source: §4.2 MEDIUM / §4.3 MEDIUM-2 / §4.9 / §4.10 recommendation 3 / §8 Phase 2 / §9 #7; done: owner-approved nonce/hash plan.

### Owner decision O9 — 4 committed JPEGs: visual review and possible history purge

- [ ] Decide after visual review whether to authorise `git filter-repo`. What: 4 phone-shaped JPEGs (736×1308, 736×552, 736×1742, 736×552) added by `ad9e045 "Add files via upload"`, staged `D` but still in HEAD; EXIF ICC only, no GPS/artist/comment; visual content NOT verified (model cannot render images). Why it blocks: potential PII in every clone; purge is a destructive history rewrite. Default safe behaviour: leave staged-deleted, exclude from PR, do not purge. Source: §4.2 MEDIUM / §5 #17 / §9 #1 / §10; done: owner visual review result recorded.

### Owner decision O10 — Branch protection: repo public vs GitHub Pro

- [ ] Decide repository visibility or GitHub Pro upgrade. What: `branches/main` → `{"protected":false}`; protection/rulesets endpoints return HTTP 403 "Upgrade to GitHub Pro or make this repository public". Why it blocks: no mechanical merge gate exists; PR #191 merged with red checks. Default safe behaviour: manual PR gate only, every fix via PR with all contexts green before merge. Source: §4.8 / §5 #5 / §8 Phase 2 / §9 #7 / §10; done: owner decision recorded.

### Owner decision O11 — Payments provider

- [ ] Decide Paystack sandbox keys, webhook signing secret, and idempotency review before enabling anything. What: no order/payment tables live, no runtime handler, no webhook; sponsorships cannot activate. Why it blocks: payments are off by design and are a money-table path. Default safe behaviour: keep payments disabled. Source: §4.1 payments verdict / §4.3 payment safety / §6 / §8 Phase 6 / §9 #8; done: owner decision recorded.

### Owner decision O12 — Guts FM rights and provider

- [ ] Decide stream rights, availability, schedule and archive behaviour. What: provider lookup previously found no match; player code is near complete. Why it blocks: cannot claim radio works without a verified stream and rights. Default safe behaviour: keep honest error state. Source: §2.1 / §2.2 #8 / §6 / §8 Phase 5 / §9 #9; done: owner decision recorded.

### Owner decision O13 — Vercel dashboard, domain/DNS/TLS, Arena transcript

- [ ] Provide Vercel dashboard access (build command, root, domains, redirects, CORS/callbacks, cron protection, storage, rate limits, monitoring), domain/DNS/TLS decision, and Arena credentials or pasted text. Why it blocks: none of these are in the repo; the Arena transcript is login-gated and nothing in the audit derives from it. Default safe behaviour: record as not inspected / not obtained. Source: §4.8 / §4.5 / §9 #11-13 / §0; done: owner provides access or explicitly defers.

### Owner decision O14 — Final merge call

- [ ] Owner makes every merge decision. What: the vote or recommendation is not the decision. Why it blocks: branch is unprotected and the manual gate in AGENTS.md §27 is the only gate. Default safe behaviour: no merge until all gates are green and reviewed. Source: §9 #14 / §10; done: owner merge record per PR.

---

## PHASE 0 — Orient, adopt locked decisions, set up a clean workspace

Scope: establish identity, toolchain, mandate inventory, locked conflict decisions, and docs reading before changing any source.
Entry condition: fresh agent with this file.
Exit/done condition: clean reproducible workspace; all §3 requests mapped to a phase; all §11 decisions acknowledged; Tier 1 docs read; no source changed.

### Chunk 0.1 — Repo identity and toolchain (§0, §1.1, §1.2)

- [x] Confirm repo identity: `gh auth status` account `epelawa`; `gh api user/repos --paginate` → exactly one repo `epelawa/EPE-LAWA`, private, updated `2026-11-20T09:18:13Z` — source: §1.1; done: values recorded in §1.1; audited commit `49bf9d80ef50afb119d6f2a415b72e864696eee0`.
- [x] Confirm full history: 444 commits, not shallow — source: §0 / §1.1; done: `git rev-list --count HEAD` = 444, `git rev-parse --is-shallow-repository` = false. First blobless clone failed (`RPC failed; curl 56 Recv failure`, `early EOF`, stale `shallow.lock`); `--depth 1` then `git fetch --unshallow origin` succeeded.
- [x] Dependencies installed: 511 MB, clean tree — source: §0 / §1.2; done: `pnpm install --frozen-lockfile --registry=https://registry.npmjs.org/` completed in 3m 4.6s; esbuild postinstall approved by `onlyBuiltDependencies`; `git status --short --branch` = `## main...origin/main`, clean.
- [ ] Handle the global registry misconfiguration without changing project files — source: §1.2; done: `/public/.npmrc` points at `https://registry.npmmirror.com` and caused `ETIMEDOUT`; every pnpm command passes `--registry=https://registry.npmjs.org/`; no project file modified for this.
- [ ] Perform a single central clean reinstall before the final gate (environment incident 2026-11-20: concurrent agent pnpm operations emptied `node_modules/.bin` and `typescript/bin`) — source: §0 environment incident / §4.12; done: clean reinstall log plus `pnpm typecheck` exit 0 after it; no source file was corrupted, dependency tooling only.

### Chunk 0.2 — Mandate inventory (§3, §2.3, §2.4)

- [ ] Capture §3 requests 1-5: full uncompromising audit with self-verified doc claims; verify which migrations ran, fix/repair what has not, create missing tables AND rows; scan whole codebase for browser-exposed secrets; list what was done wrong; list half-baked code/features/wiring with nothing omitted — source: §3 #1-5; done: each mapped to Phase 1 / Phase 2 / Phase 3 / Phase 6.
- [ ] Capture §3 requests 6-10: UX-law verification from Jakob's Law plus the Part 4 six laws (Closure, Figure-ground, Banner blindness, Parkinson's, Connectedness, Choice overload); add tokens/forms/layout rules and fix border-hugging form text; ads (bottom rise, 2s countdown, close-now, radio-card ad + shorter card, smaller mobile hero banner, two home ad slots, stronger patronise CTA); storefront feature; obtain Arena transcript — source: §3 #6-10; done: each mapped to Phase 5 / Phase 7 / Phase 9.
- [ ] Capture §3 requests 11-14: everything in ONE report with phases and a website-first-then-app next step; run tests to back evidence; fixes as PRs only, never direct main commits, with GitHub and Vercel showing no errors and fully mergeable; correct flawed scripts — source: §3 #11-14; done: each mapped to Phase 4 / Phase 8 / PROJECT FINAL GATE.
- [ ] Record the future ideas that are NOT completed scope: native apps, event ticketing, emergency contacts, scholarships and jobs, e-learning, bilingual support, AI assistant — source: §2.3 / §8 Phase 8; done: no branch or PR opened for any of them.
- [ ] Record superseded statements so they are not re-litigated: unsafe newsletter RPC restricted in production (live testing still outstanding), form rate limiting and private-enquiry staff migrations applied, breaking-news RPC applied, homepage/dashboard use latest stories not popularity, public newsroom redesign and search merged — source: §2.4; done: no checklist item relies on the superseded wording.
- [ ] Record the four main working references: `docs/handoffs/2026-11-business-directory-repair.md`, `docs/handoffs/2026-11-newsroom-editorial.md`, `docs/handoffs/2026-11-18-migration-reconciliation-status.md`, `docs/handoffs/2026-11-18-continuation-next-steps.md`; older documents are historical snapshots needing reconciliation — source: §2 (closing note); done: Phase 0 chunk 0.4 confirms they were read.

### Chunk 0.3 — Locked conflict decisions: do not re-open (§11)

- [x] picomatch: treat dependency gate as PASS; keep `CVE-2026-112366` ReDoS CVSS 8.7 as an open researcher note and recheck next audit; do NOT remove the `pnpm audit` gate — source: §11 row 1 / §4.8; done: orchestrator decision recorded §11; transitive path is build-time only (`tinygloppy → fdir → picomatch`).
- [x] Migration file count: 55 local files classified APPLIED 34 / NOT APPLIED 12 / UNKNOWN-BROKEN 9; earlier 55/52 local and 42/40 remote were different denominators signalling the same drift — source: §11 row 2 / §4.1; done: per-file table `docs/reconciliation/2026-11-20-migration-reconciliation.md`.
- [x] RadioPlayer Vercel failure: source fixed at `radio-player.tsx:10` (`children?: ReactNode`), deployment UNVERIFIED — source: §11 row 3 / §4.4; done: no claim of shipped until a green build on a specific SHA is recorded (failing run `44688075730` for `585566e`).
- [x] "24 laws": use the 26-law table in §4.5; 48px/32% peek, 70% scrim and 30→7 keys are project decisions, not law-derived facts — source: §11 row 4 / §4.5; done: §4.5 table is canonical in Phase 5.
- [x] `staff_roles_authorized()` EXISTS in production (`pg_proc` count 1, zero-arg); the SQL comment is stale — source: §11 row 5 / §4.1; done: live query recorded §4.1; single hard-coded owner email coupling still stands.
- [x] `must_change_password` EXISTS in production (`information_schema` count 1); the real gap is source reproducibility, and a forward column is a production no-op — source: §11 row 6 / §4.1; done: live query recorded §4.1.
- [x] `admin_member_delete` is broken/unapplied, not safely live; do not enable until audit-after-effect is fixed — source: §11 row 7 / §4.3 MEDIUM-3; done: decision recorded, see Owner decision O3.

### Chunk 0.4 — Docs reading list (§12)

- [ ] Read Tier 1 before signing any merge: `AGENTS.md` (repo root), `/public/EPE-LAWA-MASTER-AUDIT.md`, `docs/reconciliation/2026-11-20-migration-reconciliation.md`, `docs/14-tracker.md`, `docs/handoffs/2026-11-18-continuation-next-steps.md` + `docs/handoffs/2026-11-18-migration-reconciliation-status.md`, `docs/17-owner-requirements-checklist.md` — source: §12 Tier 1; done: each file opened and its decision-relevant claim recorded; reconciliation doc read before any DB action.
- [ ] Read Tier 2: `docs/00-master-plan.md`, `docs/01-product-requirements.md`, `docs/02-user-journeys.md`, `docs/03-sitemap.md`, `docs/04-page-specifications.md`, `docs/06-system-architecture.md`, `docs/07-database-schema.md`, `docs/08-permissions-security.md`, `docs/09-api-contracts.md`, `docs/05-design-system.md`, `docs/18-full-ui-redesign-phase-plan.md` — source: §12 Tier 2; done: reading record in session notes.
- [ ] Read Tier 3 before enabling the relevant feature: `docs/handoffs/2026-11-form-sponsor-storefront.md`, `docs/handoffs/2026-11-business-directory-repair.md`, `docs/handoffs/2026-11-member-messaging-draft.md`, `docs/handoffs/2026-11-maintenance-mode.md`, `docs/handoffs/2026-11-15-canonical-admin-build-cache-inputs.md`, `docs/16-schema-runbook.md`, `docs/schema-audit.md`, `docs/10-integrations.md`, `docs/11-testing-acceptance.md`, `docs/browser-smoke.md` — source: §12 Tier 3; done: reading record in session notes.
- [ ] Do NOT treat `docs/archive/` or older `docs/handoffs/2026-11-1x-*` files as current truth; they are factual history, not active scope — source: §12; done: no PR cites an archive doc as authority.
- [ ] Execute the one-line doc task list: update `docs/14-tracker.md` (withdrawn advisory, green statuses), align handoff claims with reconciliation, complete `.env.example`, add a README note for `/api/health` — source: §12 closing note; done: doc changes in the same PR as the code change they describe.

### Chunk 0.5 — Adopt the report's phase plan and fix order (§8)

- [ ] Apply fix order inside every phase: `7 → 12 → 3 → 2 → 8 → 6 → 4 → 5 → 9 → 10 → 11 → 13` — source: §8; done: each PR description states the layer scope and order.
- [ ] Adopt the report's Phase 0-8 and keep mobile out until Phase 8 passes — source: §8 Phase 8 / §2.3; done: no mobile branch, PR or dependency added before PROJECT FINAL GATE.
- [ ] Honour each report done-condition: Phase 0 verified files + green typecheck/tests via PR; Phase 1 drift explained, backup rehearsal signed off, no bulk replay, migration PR mergeable; Phase 2 no CRITICAL open, CSP enforced without breakage, no PII in history; Phase 3 all gates green on PR head AND post-merge main; Phase 4 width matrix + keyboard/reduced-motion/contrast pass; Phase 5 each area passes a real production workflow; Phase 6 schema+RLS+storage+webhook reviewed; Phase 7 full route × role matrix at five widths; Phase 8 only then mobile — source: §8 Phase 0-8; done: each done-condition is a checkbox in this checklist.

---

## PHASE 1 — Establish the trustworthy verification baseline

Scope: rerun build, test, scan and live checks from a clean environment; separate real product defects from environment noise.
Entry condition: Phase 0 exit condition met.
Exit/done condition: a recorded baseline table with exact commands, exit codes and a named classification of every failure; no new source change made in this phase.

### Historical baseline refresh on rebased main `920911f` (2026-11-20)

Baseline refreshed on rebased main `920911f`; PRs #192–#197 added remediation, the execution checklist, accessibility fixes, the master audit, the admin/backup workspace and the next-agent guide. Historical results in the chunks below refer to their named revisions and are not current results. No production data, schema, provider configuration or secrets were changed. The earlier draft (PR #198) recorded env-related failures (`cdn.playwright.dev` ECONNRESET, `founda-scan` ENOENT); those tools are now available in this environment (`/usr/local/bin/founda-scan`, `/usr/bin/chromium`, Playwright 1.65.1 resolvable), so the rows below were re-run with real results.

This section is retained as historical verification evidence. The current Phase 0 status, live schema reconciliation, rollback evidence and remaining exit gates are recorded in `docs/16-progress-log.md`, `docs/16-schema-runbook.md` and `docs/18-project-status-implementation-checklist.md` on the newer `main` baseline; Phase 1/release acceptance remains incomplete.

| Command / check | Result and scope (2026-11-20, feature branch `feat/full-web-implementation`, base `920911f`) |
| --- | --- |
| `pnpm typecheck` | exit 0; `Tasks: 5 successful, 5 total`, `Cached: 4 cached, 5 total` — `/public/.cache/final-typecheck.log`. |
| `pnpm build --force` | exit 0; `Tasks: 2 successful, 2 total`, `Cached: 0 cached, 2 total`, `Time: 7m9.701s` — fresh `next build --webpack` compile, no cache hits, `/public/.cache/final-build.log`. |
| `pnpm test` | exit 0: Node suite 348 passed / 1 skipped / 0 failed (349 total); Vitest 44 files, 127 tests passed — `/public/.cache/test-full.log`, `TEST_EXIT=0`. |
| `pnpm test:unit` | exit 0: 127 passed in 44 files — `/public/.cache/test-unit-full.log`, `UNIT_EXIT=0`. |
| `pnpm audit --registry=https://registry.npmjs.org --audit-level=high` | exit 0; `No known vulnerabilities found`. Plain `pnpm audit` fails only because the global npmmirror registry has no audit endpoint (environment, not a dependency finding) — `/public/.cache/final-audit-npmjs.log`, `/public/.cache/final-audit.log`. |
| `pnpm audit:ci` | exit 1 (expected): CRITICAL 20 / WARNING 167 / INFO 2667, health 77, `VERDICT: FAIL — 187 finding(s) at or above medium`. Kept as a manual local gate, deliberately NOT wired into CI (Chunk 4.4) — `/public/.cache/final-audit-ci.log`. |
| `founda-scan --json .` (real run) | exit 1 (scanner exits 1 when findings exist): 751 files analysed, 62,391 lines, 51,946 scanned, 83.26% coverage, CRITICAL 20 / WARNING 167 / INFO 2667, health/readiness 77, `layers_flagged [1,3,5,6,7,12]` — `/public/.cache/final-scan-clean.json`. A first run showed CRITICAL 23 because the audit doc and checklist pasted synthetic credential-shaped literals verbatim; those password portions were redacted to `[redacted]`, returning CRITICAL to the 20-baseline with zero real credentials. |
| `CHROMIUM_PATH=/usr/bin/chromium pnpm test:browser-smoke` | see Chunk FG.2 for the recorded result (system Chromium used because `cdn.playwright.dev` download is blocked). |

Phase 2 entry requires owner sign-off for backup/restore rehearsal and the specified owner decisions. No production migration, backup, restore or permission change is authorized by this baseline. Vercel and GitHub hosted checks for the new PR are inspected separately; local results do not establish deployment readiness.

### Chunk 1.1 — Typecheck and build baseline (§0, §4.7)

- [x] Typecheck 5/5 packages PASS, exit 0 — source: §0; done: `pnpm typecheck` completed, `TYPECHECK_EXIT=0`.
- [x] Build PASS by cache replay — source: §0 / §4.7; done: `pnpm build` exit 0, `Tasks: 2 successful, 2 total`, `Cached: 2 cached, 2 total`, no fresh compile in the QA run.
- [x] Rerun `pnpm build` with cache bypass after the clean reinstall and record a fresh compile — source: §0 / §4.7; done: `pnpm build --force` exit 0, `Tasks: 2 successful, 2 total`, `Cached: 0 cached, 2 total`, `Time: 7m9.701s`, fresh `next build --webpack` compile for both apps — `/public/.cache/final-build.log`.
- [x] Record that prior logs show clean `next build --webpack` successes and CI step 8 passed on the exact head — source: §0 / §4.7 / §4.8; done: the fresh `pnpm build --force` above proves a clean rebuild on base `920911f`; the cache-replay caveat and historical CI step 8 result remain in `docs/verification/2026-11-20-baseline-evidence.md` §3.

### Chunk 1.2 — Test baseline: exact failures (§0, §4.7)

- [x] Record `pnpm test` exit 1: 321 tests, 308 pass, 13 fail; all 43 vitest files skipped because the script is `tsx … && vitest run` and TAP failures short-circuit — source: §0 / §4.7; done: `docs/verification/2026-11-20-baseline-evidence.md` §1 table row `pnpm test` records the exact counts; superseded on current main by the green run in the baseline table above.
- [x] Record `pnpm test:unit` exit 1: `Test Files 2 failed | 37 passed (39)`, `Tests 1 failed | 105 passed (106)` — source: §0 / §4.7; done: `docs/verification/2026-11-20-baseline-evidence.md` §1 table row `pnpm test:unit`; superseded on current main by `UNIT_EXIT=0` in the baseline table above.
- [x] Record `backend/tests/schema.test.mjs` exit 1: `migration 20261119014000_private_enquiry_staff.sql failed: column p.must_change_password does not exist` — source: §4.7 failure #1; done: `docs/verification/2026-11-20-baseline-evidence.md` §1 row `backend/tests/schema.test.mjs`; fixed by the forward migration in Chunk 1.3 #1 — no production DDL run at any point.
- [x] Record CI step 9 on exact head: 321 tests / 311 pass / 10 fail, and reconcile with QA 321/308/13 as environment/worker sensitivity, consistent with flaky worker startup — source: §0 / §4.7 / §4.8; done: `docs/verification/2026-11-20-baseline-evidence.md` §1 row `CI step 9 on exact head` records both figures and the reconciliation.
- [x] Record browser smoke 9 failed / 56 passed and last 20 runs = 16 fail / 4 cancel / 0 success — source: §0 / §4.8; done: `docs/verification/2026-11-20-baseline-evidence.md` §1 rows `Browser smoke` and `Last 20 GH runs`, plus run IDs `44697062829` (CI FAIL) and `44697062850` (smoke FAIL) on push `49bf9d8`.

### Chunk 1.3 — The 13 TAP failures, classified and fixed (§4.7)

- [x] #1 `schema.test.mjs:104` genuine product defect: foundation `20261102133703_staff_access_foundation.sql:4-8` has no `must_change_password` and no migration defined it; forward migration `20261119013500_staff_profiles_must_change_password.sql` merged — source: §4.7 #1 / §4.3 MEDIUM-1 / task context; done: merged remediation PR; replay `schema.test.mjs` exit 0 from scratch to re-confirm after clean reinstall.
- [x] #2-8 seven brittle source-text assertions drifted: `admin-newsroom-settings:11`, `admin-roles:2`, `admin-same-origin:28`, `auth-shell:9,101`, `news-feature-readiness:49`, `news-fixed-layout:43`; test defects, not product defects — source: §4.7 #2-8 / task context; done: merged stale-assertion fixes; `pnpm test` shows these passing.
- [x] Fix #9 `route-manifest:34` real drift: 6 routes missing from manifest — source: §4.7 #9; done: all 6 paths present in `frontend/apps/main/public/manus-routes.json` (verified by grep, each PRESENT); `pnpm test:node` exit 0 (348 pass / 0 fail) on merged head `1f6f6aa` includes `route-manifest.test.mjs` passing.
- [x] Fix #10-12 `site-indexing:28,32,50` `ERR_NO_TYPESCRIPT`: test spawned plain `node` on a `.ts` file — source: §4.7 #10-12; done: `frontend/tests/site-indexing.test.mjs:8-14,38-39` now loads `--import tsxLoader` via `import.meta.resolve('tsx')`; `pnpm test:node` exit 0 (348 pass / 0 fail) — three indexing behaviours execute and pass, not skipped.
- [x] Fix #13 `turbo-cache-inputs:25` real drift: extra `MAINTENANCE_GATE_ENABLED` in actual env allowlist — source: §4.7 #13; done: `MAINTENANCE_GATE_ENABLED` present in `frontend/tests/turbo-cache-inputs.test.mjs:29` allowlist; `pnpm test:node` exit 0 (348 pass / 0 fail) on merged head `1f6f6aa`.
- [x] Resolve vitest environment failures: `maintenance.test.ts:22` `Cannot find package 'server-only'` + 5s timeout; 4 `Failed to start forks worker` timeouts (`progressive-forms`, `newsroom-session-recovery`, `home-breaking-ticker`, `scroll-to-top`); `uv__spawn_and_init_child` crash; harness fix `isolate:true` merged — source: §4.7 / task context; done: merged harness fix; re-run full vitest suite for exit 0 after clean reinstall.

### Chunk 1.4 — Scanner baseline (§0, §1.5)

- [x] Record founda-scan 1.2.0 baseline: 731 files, 363 files with findings, 58,335 total lines, 48,970 lines scanned, 83.95% coverage, CRITICAL 20 / WARNING 166 / INFO 2647, health 76.7 (C), readiness 76.7 (C), `layers_flagged [1,3,5,6,7,12]`, VERDICT BLOCKED — source: §0 / §1.5; done: `/public/.cache/founda-scan-epe-lawa.json` (807,764 bytes); still 20 CRITICAL / 166 WARNING after merges per task context.
- [x] Classify all 20 CRITICAL findings verbatim: 3 × `pg-conn-string` (`backend/tests/schema-audit.test.mjs:38,55,56`); 5 × `empty-catch` (`frontend/apps/admin/lib/theme.ts:8`, `frontend/apps/main/components/radio-player.tsx:16`, `frontend/apps/main/lib/share-cover.ts:15,30`, `frontend/apps/main/lib/theme.ts:8`); 12 × `hardcoded-pass` (`frontend/tests/browser-smoke/admin-dashboard.admin-smoke.ts:18,33`, `frontend/tests/browser-smoke/admin-supabase-stub.mjs:12`, `frontend/tests/browser-smoke/news-cover-feeds.spec.ts:6`, `frontend/tests/supabase-password.test.mjs:106`, `frontend/tests/supabase-session.test.mjs:8,162,202,215`, `frontend/vitest/auth-mail-hook.test.ts:38,41`, `frontend/vitest/configuration-inventory.test.ts:5`) — source: §1.5 table; done: extracted all 20 from `/public/.cache/final-scan.json` (exact file:line match to the list) and read the values. Verdict: 0 real credentials, 0 rotations required. 15 `pg-conn-string`/`hardcoded-pass` are test-only synthetic literals — `postgres://[redacted]@example.invalid/db` and `postgres://[redacted]@example` are psql-stub leak-suppression tests (password portion redacted so the scanner does not re-flag this doc), `local-admin-dashboard-smoke-token`, `sb_publishable_test_only`, `fake-access`/`fake-refresh`, `synthetic-key`, `auth@example.invalid` are smoke/vitest fixtures; 5 `empty-catch` are benign — theme `localStorage` guard and radio `AbortController` fetch cleanup. Corroborated by clean full git-history scan (598 commits) and browser secret scan; no secret value reproduced. Scanner stays heuristic — classification is evidence, not a code change.
- [x] Record warning clusters: `big-file` ×3 (`20261102200006_staff_transitions.sql` 739 lines, `20261102200010_forum.sql` 762 lines, `backend/tests/schema.test.mjs` 1,224 lines); `no-try-catch` across 16+ backend test files and admin actions (`broadcast/actions.ts`, `broadcast/page.tsx`, `business-review/actions.ts`, …); `no-timeout` ×44; `important` ×27; `inline-style` ×17; 6 radius values `11px, 12px, 18px, 20px, 22px, 999px` vs locked 2-3; `hardcoded-colour` ×404; `long-line` ×2,132; `no-error-boundary` ×6 routes; `todo` ×1 — source: §1.5; done: historical cluster detail in `docs/19-master-audit.md` §1.5; fresh 2026-11-20 top rules from `/public/.cache/final-audit-ci.log`: `long-line` 2164, `hardcoded-colour` 386, `no-try-catch` 112, `no-timeout` 45, `no-abort` 44.
- [x] Do NOT run `founda-scan --fix` — scanner verdict: nothing mechanically safe to auto-fix — source: §1.5; done: confirmed — every 2026-11-20 scanner invocation in the baseline table used `--json` only; no `--fix` flag in any recorded command.
- [x] Re-run `founda-scan --json` and report the REAL output — source: §10 merge gate #3 / §8 Phase 3; done: `/public/.cache/final-scan-clean.json` — CRITICAL 20 (baseline, not increased), WARNING 167, INFO 2667, health/readiness 77, 751 files, 83.26% coverage. First run was CRITICAL 23 because docs quoted synthetic credential literals; those were redacted in this same PR and the rescan returned 20. Final gate re-runs on post-merge main in Chunk FG.3.

### Chunk 1.5 — Live-site baseline (§4.10)

- [x] Record route matrix via `curl -L`: 200 `/`, `/news`, `/admin`, `/business-directory`, `/radio`, `/map`, `/forum`, `/tourism`, `/who-is-who`, `/sitemap.xml`, `/robots.txt`; 404 `/community-history` and `/api/health` — source: §4.10; done: evidence recorded; both 404s addressed by merged PR (§4.9).
- [x] Record security headers on `/`: `access-control-allow-origin: https://epelawa.vercel.app`, `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`, `content-security-policy-report-only: default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: https:; frame-ancestors 'none'`, `permissions-policy: camera=(), microphone=(), geolocation=()`, `referrer-policy: strict-origin-when-cross-origin`, `strict-transport-security: max-age=63072000; includeSubDomains; preload`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `x-powered-by: Next.js`, `x-vercel-cache: MISS` — source: §4.10; done: header dump recorded; `x-powered-by` removed by merged PR (§4.9); CSP still report-only.
- [x] Record live source findings: 77,155-byte homepage HTML grep for `sk_*`, `service_role`, `api_key`, `resend`, `paystack_secret`, `whsec_`, `Bearer …`, password assignments → zero matches and no emails/phone numbers in SSR payload; source maps `/_next/static/chunks/app/page-*.js.map` and `webpack-*.js.map` → 403 text/plain; inline bootstrap writes `epelawa-theme` to localStorage with empty `catch(e){}` (live form of `main/lib/theme.ts:8`); `/admin` renders "Staff workspace | EPE LAWA" login surface; 8 CSS files preloaded plus multiple JS chunks (layer 11 review) — source: §4.10; done: evidence recorded in baseline.
- [x] Re-run the route matrix and header dump on the deployed host — source: §4.10 recommendations 1-4 / §8 Phase 7; done: GET-only curl on `https://epelawa.vercel.app` 2026-11-20: 200 `/`, `/news`, `/admin`, `/business-directory`, `/radio`, `/map`, `/forum`, `/tourism`, `/who-is-who`, `/sitemap.xml`, `/robots.txt`; 200 `/api/health` with `{"status":"ok",...}`; 308 `/community-history`; 404 unknown route; no `x-powered-by` header; source map 403 text/plain; CSP still report-only (owner decision O8). First `/api/health` request timed out (cold start, `000`); immediate retry returned 200.

### Chunk 1.6 — Health/headers implementation record (§4.9)

- [x] Health endpoint: `frontend/apps/main/app/api/health/route.ts` new, `dynamic="force-dynamic"`, `GET()` returns fixed literal `{status:"ok", timestamp:<ISO>, uptimeSeconds:<number>}`, 200, `Cache-Control: no-store`, `X-Robots-Tag: noindex,nofollow`; no env read, no DB call, no version/git/error text — source: §4.9; done: merged remediation PR; vitest health 2/2 exit 0.
- [x] Health test: `frontend/vitest/health-endpoint.test.ts`, 2 tests (exact field contract + no-leak regression with sentinel env var and JWT/framework strings) — source: §4.9; done: merged; vitest exit 0, 2/2.
- [x] Framework header removal: `poweredByHeader: false` at `main/next.config.ts:6` and `admin/next.config.ts:5` — source: §4.9; done: merged; `pnpm --filter @epelawa/main typecheck` exit 0 and `pnpm --filter @epelawa/admin typecheck` exit 0.
- [x] Dead route redirect: `/community-history` → `/itan-ilu-mi` at `main/next.config.ts:37-38`, `permanent:true` (308, query strings pass through) — source: §4.9; done: merged; route sweep §4.9.
- [x] Framework-leak audit: both configs + `proxy.ts` have no `Server` header, version or runtime fingerprint; `Access-Control-Allow-Origin` kept intentionally; unhideable `/_next/static/...`, `self.__next_s`, Next HTML/route structure left alone; CSP stays report-only because enforcing without nonce/hash would break inline bootstrap and images — source: §4.9; done: orchestrator spot-check recorded §4.9.
- [x] Route sweep: every literal `href=`, `router.push(`, `redirect(` target in both apps checked; no other genuine broken internal target; apparent admin gaps are false positives because `adminHref()`/`staffHref()` prepend `/admin` (`admin/lib/admin-path.ts:11,30`) — source: §4.9; done: orchestrator spot-check recorded §4.9.
- [x] Verify live HTTP after deploy and redirect on deployed host — source: §4.9 "NOT verified"; done: GET-only curl above — `/community-history` → 308, `/api/health` 200 with exact field contract, no `x-powered-by`. RSC internals remain unmodified framework behaviour (Chunk 1.6): no secret serialised, only boolean feature flag and status rows.
- [ ] Record the flagged maintenance behaviour: `/api/health` returns 503 in maintenance mode because `lib/maintenance.ts:2-4` does not exempt it — source: §4.9 flag / Owner decision O2; done: owner decision recorded before any change; default = leave as-is.

---

## PHASE 2 — Database reconciliation and forward-only migrations

Scope: read-only production inventory, forward-only migration design, never bulk replay. PRODUCTION IS READ-ONLY FOR AGENTS.
Entry condition: Phase 1 baseline recorded; backup/restore rehearsal signed off by owner (Owner decision O6).
Exit/done condition: drift explained in the reconciliation doc, backup rehearsal signed off, no bulk replay, migration PR mergeable, live object check recorded, no DDL applied by agents.

### Chunk 2.1 — Reconciliation state (§1.3, §4.1)

- [x] Read-only object inventory completed; full per-file table at `docs/reconciliation/2026-11-20-migration-reconciliation.md` (untracked on branch `fix/migration-reconciliation`); no `db push`, no DDL, no commit, no PR — source: §4.1; done: recorded §4.1 DID/CHECKED/FLAGGED/LEFT block.
- [x] Classify all 55 local files: APPLIED 34 / NOT APPLIED 12 / UNKNOWN-BROKEN 9; only 7 local prefixes match remote; 48 local files have no ledger entry; 33 remote versions have no local file — source: §4.1; done: per-file reconciliation doc; 48 unmatched local versions make a bulk `db push` unsafe.
- [x] Record the ledger drift from the orchestrator's own read: 42 remote versions from `20261102133703` to `20261120072400`, every `local` field empty; 55 local files, latest `20261121120000_maintenance_mode.sql`; zero filename matches; handoff warning "historical versions differ from repository filenames, and some local timestamps collide. Do not bulk replay migrations." — source: §1.3 / §11 row 2; done: recorded; no bulk replay performed.
- [ ] Re-read `docs/reconciliation/2026-11-20-migration-reconciliation.md` before any DB action and confirm no agent-applied DDL exists — source: §12 Tier 1 / §4.1; done: read record plus `supabase migration list` read-only output; no production writes.
- [ ] Resolve duplicate local migration timestamps `20261107213000` and `20261114190000` (each names two different files; not duplicate SQL but must be reconciled) — source: §4.4 half-done #5 / §6; done: documented reconciliation decision; no historical migration rewritten (AGENTS.md §6).
- [ ] Confirm backup exists AND has been restored once before any migration PR merges — source: §8 Phase 1 / §9 #6; done: owner sign-off recorded; VERIFY — not established in audit.

### Chunk 2.2 — Overturned assumptions and seed inventory (§4.1, §4.9)

- [x] `must_change_password` presence OVERTURNED: live count 1; `staff_profiles` = `user_id, is_active, created_at, must_change_password`; zero column definitions in any migration before the merged forward migration; earlier claim of absence was FALSE — source: §4.1 / §4.3 MEDIUM-1 / §11 row 6; done: live `information_schema` count recorded; forward migration `20261119013500_staff_profiles_must_change_password.sql` merged per task context.
- [x] `staff_roles_authorized()` presence OVERTURNED: live `pg_proc` count 1, zero-arg; `configurable_staff_roles.sql` was right and the `private_enquiry_staff.sql:2` comment is stale; no action — source: §4.1 / §11 row 5; done: live `pg_proc` count recorded.
- [x] Forward migrations merged per task context: `20261119105000_published_articles_body.sql` and `20261121130000_site_maintenance_updated_at_trigger.sql` — source: remediation PR per task context / §4.4 news `cover_url` split-brain / §4.6 maintenance; done: files present in repo; no production DDL applied; VERIFY file content against the audit claims before treating the issues as closed.
- [ ] Record that seed/reference rows DO exist in source but production application is unresolved, and the "missing rows" list was never delivered as a confirmed inventory — source: §4.1 seed inventory / §4.9 seed follow-up; done: read-only production inventory or explicit owner deferral (O6); no production writes.
- [ ] Confirm the exact seed locations for the record: `20261102190001_capabilities_catalogue.sql:26`, `20261102200008/20261115011000` (`categories`, `authors`), `20261102200011_business_directory.sql:30` (`business_categories`), `20261114190000_configurable_staff_roles.sql:5-7` (roles/capabilities/assignments), `20261121120000_maintenance_mode.sql:9` (`site_maintenance` singleton) — source: §4.9; done: file:line re-verified; no INSERT proposed.

### Chunk 2.3 — Auth, money and deletion verdicts (§4.1, §4.3)

- [x] Auth verdict: gates fail closed live; a fresh-from-source build would fail to COMPILE the seven gated RPCs, not bypass them — source: §4.1 / §4.3 MEDIUM-1; done: recorded; seven call sites `member_directory_safe.sql:6`, `member_admin_messages.sql:10,22,40`, `private_enquiry_staff.sql:8`, `maintenance_mode.sql:25,37`.
- [x] Payments verdict: no order/payment tables live, so no money path exists; keep it that way until provider plus signed webhooks — source: §4.1 / §4.3 payment safety; done: recorded; no payment schema applied (O11).
- [x] Data deletion verdict: `admin_member_delete` logs a success that may not have happened, deletes `auth.users`, leaves R2 orphans — BLOCKED — source: §4.1 / §4.3 MEDIUM-3; done: recorded; owner decision O3 pending.
- [ ] Confirm no production DDL, writes, seeds, test data or Realtime broadcasts were applied at any point — source: §0 bottom line / §4.1 / §4.3 / task context; done: explicit statement in every DB-related PR; VERIFY — not established in audit beyond the report's claim.
- [ ] Define the storage baseline before enabling uploads: no `storage.objects` policies exist in any migration; `editorial_storage.sql:1` is "EXPERIMENT ONLY — never deploy as-is"; no upload endpoint — source: §4.3 LOW-5; done: reviewed policies PR, still unapplied.

### Chunk 2.4 — Owner decisions blocking DB work (§4.1, §4.3, §8)

- [ ] Hold all forward migration work until Owner decisions O3, O4, O5 and O6 are recorded — source: §4.1 decisions 1-3 / §8 Phase 1; done: written owner decisions in session record; default safe behaviour is no production applies.
- [ ] Reconcile the two capability paths: `has_capability("admin.access")` (`supabase-access.ts:283-301,458-466`) AND `staff_roles_authorized()` (`main/app/admin/layout.tsx:19`, `admin/app/layout.tsx:33`); both must pass, the latter applied to Production 2026-11-18 — source: §4.4 half-done #9 / §5 #16; done: one documented capability gate; contradictory migration comments removed in a forward doc/migration PR.
- [ ] Record the single hard-coded owner email coupling: `20261114190000_configurable_staff_roles.sql:18` `lower(u.email)='info.epelawa@gmail.com'`; intentional per handoff but a single-account gate in a "configurable roles" design — source: §4.4 half-done #11 / §4.3 LOW-4; done: owner acknowledges in O5, no silent change.

---

## PHASE 3 — Security closure

Scope: classify secrets, contain CSP/JPEG risk, fix the pentest findings that do not need owner approval, and record the ones that do.
Entry condition: Phase 2 owner decisions recorded where required; no production writes.
Exit/done condition: no CRITICAL open after triage, every security change reviewed, owner-gated items left disabled with written decisions.

### Chunk 3.1 — Browser secret exposure verdict (§4.2)

- [x] CRITICAL: none. No live credential found. Full-tree grep for `whsec_…`, `sk_live_…`, `sk_test_…`, `sb_secret_…`, `AIza…` and PEM private-key headers → zero matches; no secret env-var name in any `.next/static` client chunk — source: §4.2; done: recorded command results.
- [x] Client–server boundary clean: every true secret behind `import "server-only"` or `"use server"` — `form-server.ts:1` (`FORM_RATE_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`), `guts-radio.ts:1` (`NAIJA_RADIO_API_KEY`, only `import type` reaches client), `api/auth/send-email/route.ts:2,7` (`AUTH_EMAIL_HOOK_SECRET`, signature verified `:19`), `newsletter-mailer.ts:1` (SMTP secrets), `admin/(protected)/users/actions.ts:1-2` (service role, `:29-30` no log/return), `admin/lib/configuration-inventory.ts:41-43` returns only `{name,status}`; browser client uses anon key only (`supabase.client.ts:5-6`); no RSC payload serialises a secret, only a boolean feature flag (`layout.tsx:83`) and status rows — source: §4.2; done: recorded.
- [x] Token storage clean: no tokens in `localStorage`/`sessionStorage` across 60 storage sites; values are theme, consent, sound, radio reminders, sponsor flag, support coords, layout flag, viewer id, newsroom draft text in `sessionStorage` (`session-recovery.tsx:52`); auth cookies `httpOnly/secure/sameSite=lax/path=/` (`login-actions.ts:21-28`) — source: §4.2; done: recorded.
- [x] Confirmed clean: `.gitignore:13-17` ignores all `.env*` except `.env.example`; only `.env.example` exists with placeholders; all 66 `console.*` in `frontend/apps` log codes/fixed messages only; API routes return fixed messages/booleans; no `productionBrowserSourceMaps`, no `.map` files in either `.next` build, no secret names in `.next/static`; test fixtures synthetic (`playwright.smoke.config.ts:11` `browser-smoke-placeholder-not-a-secret`; `auth-mail-hook.test.ts:5` `Buffer.alloc(32,42)`) — source: §4.2; done: recorded.
- [x] Full-history scan COMPLETE: all 598 commits, all refs, CLEAN — only 5 paths ever matched a secret-like literal, all test fixtures: `backend/tests/schema-audit.test.mjs` (`postgres://[redacted]@example.invalid/…`), `frontend/tests/supabase-adapter.test.mjs` (`sb_secret_not_allowed`), `supabase-password.test.mjs`, `supabase-session.test.mjs`, `supabase-public-reader.test.mjs` (deleted in `d115f45`); no non-test file ever matched; no `sk_live_`, `whsec_<literal>`, `AIza…` or real `postgres://[redacted]@` anywhere — source: §4.2; done: recorded; severity ratings unchanged.
- [ ] Record the verification counts: 163 `process.env` reads, 62 `NEXT_PUBLIC_`, 60 storage sites, 65 secret-name refs, 66 console calls, 65 client files, 40 server-entry files all classified; zero secret-prefix matches; 0 `.map` files — source: §4.2; done: security appendix in the release PR.

### Chunk 3.2 — JPEG history and CSP (§4.2, §4.3, §4.10)

- [ ] Action Owner decision O9: visual-review the 4 committed JPEGs; if they contain member/staff/private data, owner authorises `git filter-repo` purge, otherwise leave staged-deleted — source: §4.2 MEDIUM / §9 #1; done: owner written verdict; a staged deletion does NOT remove blobs from clones.
- [ ] Record the JPEG evidence for the review: added by `ad9e045 "Add files via upload"`, dimensions 736×1308, 736×552, 736×1742, 736×552; EXIF ICC profile only (`Google Inc. 2016`), no GPS/artist/comment; `strings` found no readable text; visual content NOT verified because the model cannot render images — source: §4.2; done: review record using `git ls-tree -r HEAD`, `identify -verbose`, `strings`.
- [ ] Keep CSP report-only until reports are reviewed; do NOT enforce blindly — source: §4.2 MEDIUM (`main/next.config.ts:18`, `admin/next.config.ts:16`) / §4.3 MEDIUM-2 / §4.10 recommendation 3; done: owner decision O8 plus a nonce/hash strategy; enforcing now breaks inline bootstrap and `img-src` because no `script-src` is declared.
- [ ] Record source inventory for the privacy scope: `tsx 202 · ts 229 · sql 58 · md 141` excluding `node_modules`, plus 4 committed `.jpg` and the `artifacts/` tree of screenshots/handoffs — source: §1.6; done: privacy scan appendix.

### Chunk 3.3 — Pentest findings (§4.3)

- [x] Record the pentest verdict: no CONFIRMED CRITICAL; authorization core genuinely strong (revision CAS, restrictive RLS, capability checks inside SECURITY DEFINER RPCs, payments genuinely off); no client-controlled role escalation, no browser price trust, no exploitable IDOR, no live payment/webhook charge path; no critical invented to fill a template — source: §4.3; done: recorded.
- [ ] Fix or sign off MEDIUM-1 `must_change_password` unreproducible from source: `staff_access_foundation.sql:4-8` originally created only `user_id, is_active, created_at`; 7 call sites gate on it; `inventory.md:83` confirms the ephemeral schema test fails replaying local history; forward migration merged for fresh installs, production no-op — source: §4.3 MEDIUM-1 / §4.1; done: fresh-schema replay exit 0 and live column re-verified read-only.
- [ ] Leave MEDIUM-2 CSP report-only pending owner decision O8 — source: §4.3 MEDIUM-2; done: owner decision recorded.
- [ ] Leave MEDIUM-3 member deletion redesign pending owner decision O3: `member_admin_messages.sql:37-45` guarded correctly (`:40-41` authorized + active + not must_change_password + target≠self + non-staff + typed email match) but `:42` writes `audit_event('staff','member.delete',…,'success')` before `:43 delete from auth.users`; no R2 cleanup for `profiles.avatar_key`; no remote ledger name (`inventory.md:28`); `:71,81` flag unresolved risk — source: §4.3 MEDIUM-3; done: reviewed soft-delete design with audit after effect, still unapplied.
- [ ] Fix LOW-1 idle-timeout fail-open and client-writable activity stamp: `session-policy.ts:23-25` treats missing/garbage cookie as "not inactive"; member stamp `httpOnly:false` (`auth/actions.ts:121-127`) forgeable; JWT expiry is the real boundary — source: §4.3 LOW-1; done: server-tracked or signed timestamp, tests pass.
- [ ] Fix LOW-2 unused CSRF primitive: `checkBrowserMutation` exported but never wired to a route (`http-security.test.mjs:4-17` only); mitigated by Next Server Actions origin checks and session-token RPCs — source: §4.3 LOW-2; done: wired into mutating Route Handlers or documented reliance on Next.js.
- [ ] Fix LOW-3 retention purge unscheduled: bounded 1000 rows, `for update skip locked`, service_role only, but `form_retention.sql:3-36` says "not scheduled or applied automatically" so it never runs — source: §4.3 LOW-3; done: scheduled service-role invocation reviewed with owner; no production write by agent.
- [ ] Fix LOW-4 contradictory gate comments: `private_enquiry_staff.sql:2` claims no `staff_roles_authorized()` in production while `configurable_staff_roles.sql:1` claims applied as `20261118081756`; both pin `info.epelawa@gmail.com` — source: §4.3 LOW-4; done: one documented capability gate.

### Chunk 3.4 — Authorization matrix (§4.3)

- [ ] Re-verify the enforced authorization matrix before any admin/staff work: admin layout/actions → `getAdminAccessForSession` throws Unauthorized + `__Host-epelawa-admin` cookie; `forum_report_resolve` → `require_capability('moderation.review')`; `staff_enquiry_list/resolve` → `staff_enquiry_authorized()`; `admin_member_*` → `staff_roles_authorized()` + active + not must_change_password (if column exists, MEDIUM-1); `article_*` transitions → `for update` + `expected_revision` CAS + `require_capability` + atomic `audit_event`; `article_set_breaking` → capability + row lock + revision CAS + published-only + future expiry + audit; `comment_delete` → author-only + soft tombstone + audit; `comment_moderate/report_resolve` → DB-side `require_capability('moderation.review')` (the real boundary); `order_advance` → `sells_order()`/`order.manage` + state machine at DB; private article reads → restrictive RLS guards; saved stories → owner-only RLS + cascade; roles management → `staff_roles_authorized()` — source: §4.3 authorization matrix; done: read-only verification record, no privilege change.
- [ ] Confirm no client-controlled role escalation or IDOR was introduced by any remediation PR — source: §4.3 / §4.2; done: code review line references in PR description.

### Chunk 3.5 — Payment safety and data deletion (§4.3, §4.8)

- [ ] Preserve payment safety PASS: payments disabled by design; `marketplace_and_payments.sql:1-13` ships no payment function, webhook or order-creation function; integer kobo; server-side `products.price_kobo` + immutable `order_items.unit_price_kobo`; `payments.provider_reference` and `payment_events(provider,event_id)` UNIQUE for replay safety; anon/auth SELECT only; no Paystack runtime code, only optional env entries (`configuration-inventory.ts:26-28`); `requestProductOrder` sends `product_id` + `quantity`, never a price (`order-actions.ts:10-12`); `active_business_sponsorships` requires `status='succeeded' and verified_at not null` — source: §4.3 payment safety; done: no real-charge path introduced. FLAG: money-table path, owner decision O11 required before any change.
- [ ] Preserve data-deletion positives: comments author-only, soft, audited (`news_comments_forward_only.sql:127-161`); moderation capability-gated and audited; retention bounded and service-role-only — source: §4.3 data deletion; done: read-only verification record. FLAG: data-deletion path.
- [ ] Record the unresolved deletion gap: no confirmation-dialog/soft-delete evidence on admin member-delete beyond the typed-email RPC check — source: §4.3 data deletion; done: owner decision O3.

### Chunk 3.6 — Pentest limits (§4.3)

- [ ] Record that no OS sandbox was available, so no target code, tests, migrations or DB replay were executed by the pentester; all dynamic claims need validation — source: §4.3 unverified/limits; done: this checklist's verification logs supply the validation.
- [ ] Record that production schema equivalence is unknown: `inventory.md:3` "a name match is not proof that SQL is equivalent or fully applied"; 20 local files have no remote ledger name — source: §4.3 unverified/limits; done: read-only object inventory result attached to Phase 2.
- [ ] Record remaining unverified items: email/Paystack status unproven; `guts-radio.ts:17-20` localhost blocking visible but DNS-rebinding resistance not fully verified; `must_change_password` and `staff_roles_authorized()` were handoff claims later confirmed live by §4.1 — source: §4.3 unverified/limits; done: VERIFY — not established in audit where still open.

---

## PHASE 4 — CI/CD green, audit gate, environment and docs

Scope: make every declared gate real, fix the missing evidence rules, complete env docs, and record that CI contexts plus browser smoke were deferred by the developer to the project end.
Entry condition: Phase 3 security triage complete; owner decision O1 (Vercel access) and O10 (branch protection) recorded.
Exit/done condition: all four `audit*` scripts either work or are removed; `.env.example` complete; tracker current; Actions pinned; missing smoke evidence fails; a written deferred-GATES note exists; final green verification happens in PROJECT FINAL GATE.

### Chunk 4.1 — Workflows and current failures (§4.8, §5 #5, #18)

- [x] Record the single most important operational finding: CI is red on main and is NOT blocking merges — source: §4.8; done: recorded.
- [x] Verify `.github/workflows/ci.yml`: triggers PR + push to main; `contents:read`; concurrency cancels stale runs; exact pins pnpm 10.34.9 / Node 22; frozen install; `typecheck → build → test → audit --audit-level=high → whitespace`; CodeQL job `build-mode:none`; no secrets referenced — source: §4.8; done: file read directly — `ci.yml:1-56` confirms PR+push main, `contents: read`, `cancel-in-progress: true`, `actions/checkout@v7`, `pnpm/action-setup@v6`, `actions/setup-node@v7`, pnpm `10.34.9`, Node `'22'`, frozen install, and the ordered steps. Actions still pinned to mutable major tags (separate open item).
- [ ] Pin Actions to commit SHAs instead of major tags (`@v7/@v6/@v4` are mutable refs, HIGH hygiene issue) — source: §4.8 / §5 #18; done: workflow diff with SHA pins.
- [ ] Verify `.github/workflows/browser-smoke.yml`: installs Chromium, runs 7 public specs, uploads SHA-labelled screenshots; `:68 if-no-files-found: ignore` means missing evidence does not fail the job — source: §4.8; done: change `:68` so missing evidence fails; smoke evidence uploaded per SHA.
- [x] Record both workflows currently FAIL: `verify` fails at step 9 `Test` (321 tests / 311 pass / 10 fail, e.g. `public route manifest matches the Next page tree`, `cross-app raw imports participate in each app build cache key`), so the audit step never runs; `public shell` fails at step 8 (9 failed / 56 passed — `dashboard-tabs.spec.ts:280`; five widths in `news-filter-navigation.spec.ts:6`, `:50`, `:74`; `public-routes-audit.spec.ts:55` radio heading `"Listen live."` not found) — source: §4.8; done: recorded verbatim in `docs/verification/2026-11-20-baseline-evidence.md` §3. Fix PRs still tracked separately under Phase 4.

### Chunk 4.2 — Run history and deployment evidence (§4.8, §10)

- [x] Record run history: last 20 runs = 16 failure / 4 cancelled / 0 success; latest push main `49bf9d8` → CI `44697062829` FAIL, smoke `44697062850` FAIL; PR #191 head `6839edc` → both FAIL; CodeQL passed in every CI run inspected; PR #191 merged with both workflows failing on its exact head and on the resulting main — source: §4.8; done: recorded in `docs/verification/2026-11-20-baseline-evidence.md` §1 and §3 with run IDs.
- [x] Record deployment evidence: PR #183 `9fd5ba9` Vercel success `2026-11-18T11:50:01Z` / `11:50:43Z` on branch `arena/30600275-epe-lawa` = preview; PR #182 `ac512f5` Vercel success `11:40:48Z` / `11:41:35Z` = preview; main `49bf9d8` Vercel success `2026-11-20T07:45:40Z` and Supabase Preview success while CI/smoke FAIL, proving deployment is NOT gated by tests — source: §4.8; done: recorded in `docs/verification/2026-11-20-baseline-evidence.md` §4; green deploy on a red-CI commit is explicitly noted as not acceptance evidence.
- [x] Record `gh api repos/.../deployments?sha=…` returned empty arrays for PR heads (no GitHub Deployments promotion records); Vercel dashboard state beyond GitHub status contexts not inspected — source: §4.8; done: recorded in `docs/verification/2026-11-20-baseline-evidence.md` §4; Vercel dashboard access is Owner decision O13.
- [x] Record PR #192 contexts (task context): merge `05efaf5` / head `1f6f6aa`; `Vercel` FAIL "Git author Brave290 must have access to the project on Vercel to create deployments."; `Browser smoke / public shell` pending; `CI / CodeQL security analysis` pending; `CI / verify` pending; `Vercel Preview Comments` pass; `Supabase Preview` skipping — source: task context; done: full context table in `docs/verification/2026-11-20-baseline-evidence.md` §5 plus owner decision O1; agents must not bypass or re-author commits; final-gate re-verification checkbox added.
- [x] Record open-PR and hosted-context state — source: §4.8 / §10; done: `gh pr list --state open` on 2026-11-20 returned PR #198 (`Record phase one verification baseline`, `arena/cc88b830-epe-lawa`), a stale draft whose "founda-scan unavailable / browser install failed" claims were superseded by this branch's real runs. Its hosted contexts on head `51a1231`: `CI / verify` PASS, `Vercel` PASS (`Deployment has completed`), `Vercel Deployments` PASS, `Supabase Preview` skipping, `Browser smoke / public shell` FAIL, `CI / CodeQL security analysis` FAIL. The two FAILs are environmental: CodeQL annotation says "Code scanning is not enabled for this repository. Please enable code scanning in the repository settings" (owner repo-settings action, not a code defect); browser smoke failures are the recorded 30s-timeout/known failures. `Vercel` PASS here vs FAIL on PR #192 confirms the O1 blocker is git-author-specific (`epelawa` authored #198, `Brave290` authored #192), not a project fault.

### Chunk 4.3 — Branch protection and PR rule (§4.8, §5 #5, §10)

- [ ] Record branch protection CONFIRMED NONE: `branches/main` → `{"protected":false}`; `/branches/main/protection` and `/rulesets` → HTTP 403 "Upgrade to GitHub Pro or make this repository public"; private repo, all three merge methods enabled, `delete_branch_on_merge:false` — source: §4.8; done: recorded; Owner decision O10.
- [ ] Enforce the manual PR gate in AGENTS.md §27: every fix via feature branch → PR → all contexts green + review → merge → rerun checks on main — source: §4.8 / §10; done: no direct commit to main in `git log --first-parent`.
- [ ] Record PR-rule violations: 69 first-parent non-merge commits, 25 `(#NNN)` squash subjects, 11 more PR-associated via API, 33 with no PR association (historical, mostly pre-#131 bootstrap: `caafae24` dependabot.yml, `74d8e2ee` footer/header rewrite, `a48abbcb` payments layer, `429c8067` Vercel fix, `ce08fa9` Initial commit); recent 60 first-parent entries are all `Merge pull request #NNN` — source: §4.8; done: historical note only, no rewrite.
- [ ] Enforce PR #192 merge commit record (`05efaf5` / head `1f6f6aa`) as the new baseline after `49bf9d8` — source: task context; done: all subsequent PRs based on current main, not the audited head.

### Chunk 4.4 — Audit gate (§1.4, §4.7, §4.11, §5 #6)

- [x] Restore the audit gate entry point: `scripts/audit/run.mjs` new, dependency-free Node wrapper; parses `--only=hacking|ui`, `--fail-on=medium|high|critical`, `--json`, `--help`; invalid args exit 2; runs `founda-scan --json`, parses stdout even on scanner exit 1, fails loudly on invalid JSON; `hacking`=layer 12, `ui`=layers 1/3 + `hardcoded-colour`; severity mapping `medium`=WARNING+, `high/critical`=CRITICAL; override via `FOUNDA_SCAN_BIN` — source: §4.11 / task context; done: merged remediation PR; file present and orchestrator spot-checked.
- [x] Verify real scanner output through the wrapper: `pnpm audit:ci` → CRITICAL 20 / WARNING 166 / INFO 2647, health 76.7, VERDICT FAIL — 186 findings ≥ medium, exit 1; `--only=ui` → CRITICAL 0 / WARNING 11, PASS, exit 0; `--json --only=hacking` → CRITICAL 15, exit 1; `--fail-on=critical` → FAIL 20, exit 1; `--only=nope` → exit 2 — source: §4.11; done: merged; no suppression or fabricated score.
- [x] Record the intelligence decision: CI stays on `pnpm audit --audit-level=high`; do NOT wire `audit:ci` because 186 blocking findings make it permanently red and `founda-scan` is a global tool, not a declared dependency; keep it as a manual local gate; `ci.yml` untouched — source: §4.11; done: decision recorded; add `--fail-on=critical` only after triage and CI tool provisioning.
- [ ] Record the flags: `founda-scan` undeclared (add as devDependency if ever automated); 731 files vs 730 baseline because the wrapper itself is scanned (expected) — source: §4.11; done: release notes mention both.
- [ ] Record that the four scripts were originally dead: `audit`, `audit:security`, `audit:ui`, `audit:ci` at `package.json:20-23` all pointed at missing `scripts/audit/run.mjs`, and `ls scripts/audit/` returned `No such file or directory` — source: §1.4 / §4.7 / §5 #6; done: recorded; gate now fails loud, not silently green.

### Chunk 4.5 — Env vars, advisory and tracker (§4.2, §4.4, §4.8, §5 #15, #20)

- [x] Complete `.env.example` for every name referenced in code but absent or commented-only: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_WEB_PUSH_ENABLED`, `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`, `ADMIN_ORIGIN`, `DATABASE_URL`, 5× `NEWSLETTER_SMTP_*`, `FORM_RATE_SECRET`, `ENQUIRY_INTAKE_ENABLED`, `NEWSLETTER_SIGNUP_ENABLED`, `NAIJA_RADIO_API_KEY` — source: §4.8 config+env gaps; done: all 17 names verified present in `.env.example` via grep (each OK); credential-shaped scan clean (placeholder `<...>` values only); gated flags (`NEWSLETTER_SIGNUP_ENABLED`, `ENQUIRY_INTAKE_ENABLED`) remain commented intentionally with names documented; `FORM_RATE_SECRET` moved to active placeholder. Name inventory enumerated from `process.env.*` references in source.
- [x] Align the VAPID name mismatch: `.env.example` documented dead `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` names, `main/lib/vapid.ts:1` reads `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; public half only, not an exposure — source: §4.2 LOW / §5 #15; done: removed the two dead bare names; `.env.example` Web Push block now documents only `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (the exact code name) and `NEXT_PUBLIC_WEB_PUSH_ENABLED`; repo-wide grep confirms no source references the bare names.
- [ ] Decide one Supabase naming scheme and record it — source: §8 Phase 3 / §4.4 half-done #10 (`SUPABASE_PUBLISHABLE_KEY` not listed in root `.env.example`, only `SUPABASE_SERVICE_ROLE_KEY` at `:18`) / §5 #15; done: owner or tech-lead decision recorded in `.env.example` header comment. STILL OPEN — NEEDS OWNER DECISION. Interim: `.env.example` now lists both name sets as commented placeholders under a `NEEDS OWNER DECISION (checklist item 339)` note (do not set both schemes). No scheme chosen by an agent.
- [x] Update `docs/14-tracker.md`: withdraw the stale high-severity picomatch blocker at `:12`; record `pnpm audit --registry=https://registry.npmjs.org` → No known vulnerabilities found at all levels, OSV `{}`, Dependabot 0 alerts, lockfile has `4.0.7` and `2.3.2` outside the affected `>=4.0.0,<4.0.4` range, `GHSA-fc5q-39xc-vjpf` WITHDRAWN `2026-11-18T15:38:56Z`; keep the `CVE-2026-112366` note open per §11 — source: §4.8 / §11 row 1 / §5 #20; done: dated 2026-11-20 refresh note added at the tracker top; fresh `pnpm audit --registry=https://registry.npmjs.org --audit-level=high` exit 0 `No known vulnerabilities found` (`/public/.cache/final-audit-npmjs.log`), lockfile versions confirmed by grep; `CVE-2026-112366` left noted open.
- [x] Remove the `pnpm-workspace.yaml.bak` leftover — source: §4.4 half-done #10 / §5 #20; done: `git rm pnpm-workspace.yaml.bak` (only diff to real file was one blank line); zero references in source; `pnpm -r list --depth -1` exit 0 (workspace resolves); `pnpm build` exit 0 after removal.
- [x] Record that plain `pnpm audit` fails only because of the dead global npmmirror registry (environment, not a dependency finding) — source: §4.8; done: `/public/.cache/final-audit.log` shows `ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS` at `registry.npmmirror.com`; `pnpm audit --registry=https://registry.npmjs.org --audit-level=high` exit 0 `No known vulnerabilities found` — `/public/.cache/final-audit-npmjs.log`. Tracker note in `docs/14-tracker.md` (Chunk FG.4).

### Chunk 4.6 — Deferred gates (task context) and release gate steps (§4.8)

- [ ] Record the developer's deferral: browser smoke (Playwright; CI installs Chromium) and GitHub CI contexts were deferred to the project end; do NOT action them mid-project — source: task context; done: this checkbox is the record; work resumes in PROJECT FINAL GATE.
- [ ] Record the required release gate steps from §4.8 for final execution: (1) clean integration base and account for the 4 deleted `.jpg`, work on a feature branch; (2) fix unit failures green on PR head and post-merge main; (3) fix smoke failures across five widths and make missing evidence fail; (4) keep `pnpm audit`, implement or delete `audit*` scripts, update tracker; (5) complete `.env.example` and choose one Supabase naming scheme; (6) inspect Vercel dashboard config; (7) read-only reconciliation plus one restored backup and signed-off forward plan; (8) manual PR gate with all checks green and review, rerun on main; (9) record exact production SHA plus read-only prod smoke, health endpoint, uptime/error-rate alerts, no secrets in logs; (10) only then mobile — source: §4.8 release gate; done: each item cross-referenced in this checklist.

---

## PHASE 5 — Design system, forms, ads, ticker, radio, hero, responsive and a11y

Scope: land tokens as the single source of truth, repair the form-spacing root cause, meet the ad/radio/hero spec, and pass the five-width plus keyboard/reduced-motion matrix.
Entry condition: Phase 4 deferred-gates note recorded; merged visual upgrade re-verified on current main.
Exit/done condition: 320/375/768/1024/1440 matrix plus keyboard, focus, screen-reader semantics, reduced motion and contrast all pass; scanner radius/colour counts drop; no off-palette hex introduced.

### Chunk 5.1 — Canonical UX-law reference (§4.5)

- [x] Use this 26-law table as the canonical reference. Correction: "Twenty-four laws. Four parts." traces to a social motion-graphics series (`UX LAWS IN ACTION · Part 4`, @motion_ui_interface), NOT a canonical academic taxonomy; the mandate named 26 distinct laws (Hick's = Choice Overload; Part 4 adds Banner Blindness and Connectedness); lawsofux.com currently lists 30; no source supports one authoritative "24" containing all of them — source: §4.5; done: table recorded below.

| # | Law | Designer rule | Source |
| --- | --- | --- | --- |
| 01 | Jakob's Law | Copy conventions; innovate only where it earns cost | lawsofux.com/jakobs-law/ (Nielsen 2000) |
| 02 | Fitts's Law | Big near targets; padding beyond the icon | nngroup.com/articles/fitts-law/ |
| 03 | Hick's Law / Choice Overload | Reduce up front; tier, filter, default | lawsofux.com/hicks-law/ · /choice-overload/ |
| 04 | Miller's Law | Chunk; never show ungrouped strings | lawsofux.com/millers-law/ (Miller 1956) |
| 05 | Proximity | Tight label→input 4–8px, loose field→field 24–32px | nngroup.com/articles/gestalt-proximity/ |
| 06 | Similarity | One treatment per meaning; reserve colour for primary CTA | nngroup.com/articles/gestalt-similarity/ |
| 07 | Common Fate | Animate related items together only | nngroup.com/articles/visual-design-cheat-sheet/#CommonFate |
| 08 | Good Continuation | Continuous path implies order | nngroup.com/articles/visual-design-cheat-sheet/#Continuation |
| 09 | Closure (Part 4 #01) | Show part of the next card | nngroup.com/articles/principle-closure/ |
| 10 | Figure–Ground (Part 4 #02) | Make one thing dominate; suppress rest | nngroup.com/articles/visual-design-cheat-sheet/#FigureGround |
| 11 | Peak–End Rule | Engineer success moment and final handoff | lawsofux.com/peak-end-rule/ |
| 12 | Aesthetic-Usability Effect | Get type/spacing/hierarchy right first | nngroup.com/articles/aesthetic-usability-effect/ |
| 13 | Doherty Threshold | Respond under 400ms or show immediate feedback | lawsofux.com/doherty-threshold/ (IBM 1982) |
| 14 | Zeigarnik Effect | Show what's still outstanding | lawsofux.com/zeigarnik-effect/ |
| 15 | Tesler's Law | Push complexity to defaults, not users | lawsofux.com/teslers-law/ |
| 16 | Parkinson's Law (Part 4 #04) | Constrain fields, cap length, autofill | lawsofux.com/parkinsons-law/ (Parkinson, The Economist, 19 Nov 1955) |
| 17 | Occam's Razor | Delete elements carrying no information | lawsofux.com/occams-razor/ |
| 18 | Goal-Gradient Effect | Show progress, especially near completion | lawsofux.com/goal-gradient-effect/ |
| 19 | Endowed Progress Effect | Credit real prior actions | Nunes & Drèze (2006), JCR 32(4) 504 |
| 20 | Von Restorff Effect | Make the one important item distinct | lawsofux.com/von-restorff-effect/ |
| 21 | Serial Position Effect | Priority items first/last, not mid-list | lawsofux.com/serial-position-effect/ |
| 22 | Framing Effect | State outcome honestly in decision-relevant frame | nngroup.com/articles/decision-framing-cognitive-bias-ux-pros/ |
| 23 | Confirmation Bias | Seek disconfirming evidence; test users who fail | Nickerson (1998), doi:10.1037/1089-2680.2.175 (not re-fetched) |
| 24 | Anchoring | Truthful anchors; reference price, realistic defaults | nngroup.com/articles/anchoring-principle/ |
| 25 | Banner Blindness (Part 4 #03) | Style important notices like content, inline | Benway & Lane PDF (rice.edu) · Benway 1998 (Sage) |
| 26 | Connectedness (Part 4 #05) | Join step circles with a continuous rule | nngroup.com/articles/visual-design-cheat-sheet/#Connectedness · Palmer & Rock 1994 |

- [ ] Respect the attribution flags: Choice Overload is not a separate 25th law; Benway & Lane (1998) is valid for the Rice report but the canonical HFES paper lists Jan Panero Benway alone, so do not state both as one paper; Connectedness ≠ Good Continuation ≠ Common Fate; Miller's 7±2 is a 1956 absolute-judgement finding with modern estimates lower, so treat it as heuristic; Tesler's attribution is conventional (primary Saffer 2010); Parkinson's is an essay aphorism, not an experiment; Doherty <400ms is an IBM internal figure, not a biological constant — source: §4.5; done: client docs use the flags.
- [ ] Enforce the §4.5 numeric-claim caveat: jam study 24 vs 6 options and 3% vs 30% purchase = VERIFIED exact (Iyengar & Lepper 2000, JPSP 79(6) 995–1006, X²(1,N=249)=32.34, p<.0001; display 6 vs 24 jams; the 24-stop chocolates experiment is different); carousel peek ≈48px/32% = UNKNOWN (design taste, NN/g supports only the technique, envydesign recommends 10–20%); focus backdrop ≈70% = UNKNOWN as rule (Material 32%, FanDuel 60%, guidance 40–70%); Parkinson 30 keys → 7 keys = UNKNOWN, likely an unsourced Arena illustration; Doherty <400ms = VERIFIED IBM 1982; 44×44 CSS px targets = VERIFIED but WCAG 2.1 SC 2.5.5 AAA, while WCAG 2.2 AA SC 2.5.8 is 24×24 or spacing exception, so keep 44×44 as the locked project standard and never call it AA — source: §4.5; done: no marketing/client doc presents unknown numbers as law.
- [ ] Apply the source-backed form rules: label closer to its input than to any other item including a container border (NN/g form-design-white-space); container inner padding larger than label→input gap; label→input 4–8px and input→next field 24–32px (INFERRED reference numbers from `ui-ux-suite@0.7.3`, not W3C); labels above inputs, never placeholder-as-label (GOV.UK); group related controls with `fieldset`+`legend`; chunk long forms (NN/g 15-field form read as 3 groups of 4–6); visible focus is AA and borders/rings need 3:1 (WCAG 2.1 SC 2.4.7, SC 1.4.11), never `outline:none` without `:focus-visible`; reflow at 320px/400% zoom with no horizontal scroll (SC 1.4.10); autofill via standard tokens; exact Material text-field inner padding UNKNOWN, no number claimed — source: §4.5; done: form PR cites each rule.
- [ ] Record the sources index as retrieved 20 Nov 2026: nngroup.com/articles/{principle-closure,gestalt-similarity,visual-design-cheat-sheet,form-design-white-space,anchoring-principle,decision-framing-cognitive-bias-ux-pros,aesthetic-usability-effect,fitts-law}; lawsofux.com/{index,choice-overload,goal-gradient-effect,doherty-threshold,jakobs-law,millers-law,teslers-law,occams-razor,peak-end-rule,zeigarnik-effect,von-restorff-effect,serial-position-effect,parkinsons-law}; Iyengar & Lepper primary PDF (faculty.washington.edu); rice.edu banner_blindness.pdf + Sage 10.1177/154193129804200504; academic.oup.com JCR 32(4) 504; w3.org/WAI tutorials + WCAG 2.1/2.2 understanding; design-system.service.gov.uk text-input + fieldset; m2.material.io dialogs; fanduel.design modals; envydesign.jp carousel-peek; `ui-ux-suite@0.7.3` npm tarball `knowledge/laws-of-ux.md` — source: §4.5; done: reference appendix in design PR.
- [ ] Record that the Arena fetch returned only the landing page title (client-rendered/login-gated) and nothing in the audit derives from it; the "24 laws / four parts" attribution comes from public posts quoting @motion_ui_interface — source: §4.5 / §0 / Owner decision O13; done: no claim cites Arena content.

### Chunk 5.2 — Form spacing root cause and all 22 cases (§4.6, §7)

- [x] Record the confirmed root cause of the form complaint: intended 16px inset tokens exist (`main/app/globals.css:13-15`, `admin/app/globals.css:7-9`, applied at `globals.css:413-415` / `admin/globals.css:173-175`) but the selectors use `:where(form) :where(...)` with specificity 0,0,0, so every component rule with real specificity beats them — source: §4.6 / §7 Proximity FAIL; done: diagnosed and replaced by `.ep-control` in the merged visual upgrade; re-verify computed inset on current main.
- [ ] Fix and verify all 22 spacing cases below (source: §4.6 form spacing audit; done: computed-style check per file at 320/375/1440 plus a PR screenshot set):

| file:line | current | fix |
| --- | --- | --- |
| `globals.css:86` | `padding: 11px 14px` | tokenise to 16/12 |
| `admin/globals.css:22` | `padding:11px 14px` | tokenise |
| `auth.css:51` | `.auth-field input { padding: 10px 12px }` (12px inline beats zero-specificity token; signup/login/reset) | `padding-inline: var(--form-control-inline)` |
| `auth.css:275-283` | `padding: 10px 15px` | token |
| `auth.css:176`, `:357` | `padding-block: 8px` at ≤360px (worst gap in repo) | 12px block |
| `auth.css:49`, `:175`, `:273` | `gap:5px` → `4px`, defeats `--form-field-gap:10px` | use token |
| `auth.css:54`, `:288` | `font-size:11px` / `10.5px` | 12px floor |
| `newsletter-unavailable.module.css:4` | `padding: 0 13px` | 16px |
| `newsletter-unavailable.module.css:30`, `:38` | `@media(max-width:360px){ padding-inline:10px }` (tightest at 320px) | remove override |
| `news.module.css:18` | `padding:0 12px` | 16px |
| `listing.module.css:153` | `padding:10px 14px` | 16px |
| `listing.module.css:142` | `padding:10px 16px` | 12px block |
| `floating-support.module.css:17` | `padding:11px 12px` | 16px |
| `admin/news-article-composer.module.css:16` | `padding:12px 14px` | 16px |
| `admin/news-share-tools.module.css:14` | `padding:12px` textarea | 16px |
| `admin/newsroom-list.module.css:13` | `padding:0 36px 0 14px` select | 16px |
| `dashboard.module.css:87` | `padding:9px 12px` | 16px |
| `dashboard.module.css:28-31` | `.handleField input { border:0 }`, effective inset global 14px | 16px on wrapper |
| `directory.module.css:10`, `:9` | `padding:10px 12px`; wrapper `0 12px` | 16px |
| `native-controls.css:28`, `:101` | `padding:10px 12px`, `9px 12px` dropdown/file | 16px |
| `admin/login/login-form.tsx:16,20` | `className="field__control"` has no CSS definition anywhere | define or replace |
| `main/components/admin-login-form.tsx:13,54` | `className="auth-input"` also undefined | define or replace |

### Chunk 5.3 — Tokens and component state coverage (§4.6, §5 #10)

- [x] Visual upgrade tokens landed per task context: `frontend/packages/ui/src/tokens.css` is the single source of truth with owner-locked cobalt palette (Midnight `#0A1023` … Border `#293650`), type 1.250 major third 12/14/16/20/25/31/39/49px, space 4px base, only 8/12/999px radii, one shadow per elevation, motion 120/200/320ms plus ad 240ms with named easings and reduced→`0.01ms`, forms 16px inline / 12px block inset, 48px min control, 44px touch, glass restricted to dialogs/drawers/popups (10px blur, `.58` scrim, solid `@supports` fallback) — source: §4.12 / task context; done: merged remediation PR; re-verify token values on current main.
- [ ] Lock the proposed rules from §4.6 and remove the stray parallel system in `frontend/packages/ui/src/tokens.css:2-9` (`--ep-ui-lilac`, `--ep-ui-limestone`, etc.); make `globals.css` reference the locked palette — source: §4.6 proposed tokens / §5 #10; done: 8 palette hexes single-sourced, radius count ≤3 in a fresh scan.
- [ ] Add these token/rule values exactly: `--ep-ui-radius-sm/md/pill` = `8px / 12px / 999px` (repo uses 6,7,8,9,10,11,12,14,15,16,18,20,22,24,26,28); `--ep-ui-control-px/-py` = `16px / 12px`; `--ep-ui-control-min-h` = `48px`; `--ep-ui-field-gap/--ep-ui-label-gap` = `12px / 8px`; `--ep-ui-touch-min` = `44px` (reuse `--touch-min` at `globals.css:61`); `--ep-ui-focus-ring/-w/-offset` = `#477FE0 / 2px / 3px`; `--ep-ui-overlay` = `rgb(10 16 35 / .58)`; `--ep-ui-peek` = `32%`; `--ep-ui-ad-exposure/-delay/-rise` = `2s / 10s / 240ms`; `.ep-control` utility using `padding-inline:var(--ep-ui-control-px); padding-block:var(--ep-ui-control-py)`; `@media (pointer:coarse){ … min-height:44px }`; remove `overflow-x:hidden` at `navigation-refinement.css:85`; `--ep-ticker-label: .6875rem` at `home-breaking-ticker.module.css`; sponsor CTA button-style at `sponsor-slot.module.css:45`; ≥1 section gap between `app/page.tsx:111-112` ad and consent notice — source: §4.6 proposed tokens; done: token diff plus scanner radius/colour counts drop.
- [ ] Fill component state gaps: `.btn-*` / `.ep-button` have default ✓ hover ✓ focus ✓ disabled ✓ but active ✗ loading ✗ success ✗ error ✗ offline ✗; inputs hover ✗ and error partial (`aria-invalid` auth only); radio player is strongest at 10/10 including 5 error states at `:46`; sponsor popup has no error state; search/filter no disabled/offline; stepped forms no disabled/offline; hero carousel no image `onError` and no empty state; `connectivity.tsx` provides offline toasts — source: §4.6 component state coverage; done: each state present and visually checked.
- [ ] Record the radius/colour drift evidence: 6 distinct radii (`11px, 12px, 18px, 20px, 22px, 999px`) vs locked 2–3, 404 hardcoded hexes, and a parallel token system — source: §1.5 / §5 #10 / §4.6; done: fresh scanner counts in Phase 1 baseline compared with final counts.

### Chunk 5.4 — Ads and sponsor spec (§3 #8, §4.6, §5 #13)

- [ ] Verify current slots: `app/page.tsx:39` after `HomeBreakingTicker` at `:37` ✓; `app/page.tsx:111` after community panel before `CookieBanner` at `:112` ✓ (two home slots as requested); `radio/page.tsx:13` inside card ✓; extras at `advertise/page.tsx:33`, `dashboard/news-content.tsx:227`; global popup at `app/layout.tsx:82` — source: §4.6 ad placement audit; done: DOM check on current main.
- [ ] Verify popup behaviour: `sponsor-popup.tsx:9-37`, 10s delay (`:13-18`), 2s countdown (`:23`), "Close now" (`:36`), pauses on hover/focus/hidden (`:26-31`), dismisses on form/dialog focus (`:28`), once per session (`:12`), non-modal; honest labelling at `sponsor-slot.tsx:54` and `sponsor-popup.tsx:35` — source: §4.6; done: manual browser check at 320/375/768/1024/1440.
- [ ] Close the spec gaps: "bottom up to half-midway" not met because `sponsor-popup.module.css:1` is `position:fixed; right:16px; bottom:calc(82px + …); width:min(350px,…)` with no upward travel or entrance keyframes; `sponsor-popup.module.css:2` link `min-height:36px` below 44px; no `role="status"` (handoff:5 admits this); `sponsor-popup.tsx:32` moves focus to `#main`, so confirm `#main` has `tabindex="-1"` or focus is dropped — source: §4.6 / task context; done: merged visual upgrade added `role=status`, 24px/240ms rise and 44px CTA; re-verify upward travel and focus landing on current main.
- [ ] Strengthen the CTA and fix banner blindness: `sponsor-slot.module.css:45-50` `.action { color:#294b91; font-size:0.82rem; font-weight:800 }` is plain text with no pill, no 44px target, no hover lift; sponsor at `page.tsx:111` sits directly above `CookieBanner` at `:112`; `sponsor-slot.module.css:9` dashed border + gradient + shadow is correctly ad-shaped and must not sit against the consent notice — source: §4.6 / §7 Banner Blindness FAIL; done: merged upgrade set "Patronise this local business" and moved the footer ad clear of the cookie notice; re-verify ≥1 section separation.
- [ ] Record that `sponsor-popup.tsx` still has no error state — source: §4.6 component states; done: decide and add or document as intentional.

### Chunk 5.5 — Radio card and hero mobile (§3 #8, §4.6)

- [ ] Verify the compact radio override: `radio-player.module.css:23-36` deliberately overrides `:1-7`; `.player` padding `clamp(20px,3vw,30px)` vs original `clamp(22px,5vw,50px)` and radius 28px; `.nowPlaying` `14px 0` vs `24px 0`; `.artwork` 108×108 vs 164×164 and 90×90 ≤520px; `.playButton` 64×64 vs 86×86; `.status` min-height 0 vs 2.5em; `.stationList button` 62px (`:7`'s 64px is dead) vs 80px; `.provider` `12px` vs `24px 0 0`; `.sponsor` 16px top — source: §4.6 radio card audit; done: computed-style check at five widths.
- [ ] Confirm sponsor inside card: `radio-player.tsx:68` renders `{children}` in `.sponsor` and `radio/page.tsx:13` passes `<SponsorSlot compact />` — source: §4.6; done: DOM check.
- [ ] Write and apply a documented height budget: `docs/handoffs/2026-11-14-radio-lagos-1075-player.md:20` only says "player visible in first fold" at 375×812, and `docs/screenshots/radio-lagos-1075/2026-11-14/README.md:3-8` gives no numeric height — source: §4.6 / §5 #14; done: numeric budget in the handoff and a computed-height check against it.
- [ ] Remove the duplicate CSS rule blocks (`radio-player.module.css:1-7` vs `:23-36`) and replace off-palette hexes including `.gutsIcon { background:#665cc6 }` at `:5` plus ~20 others with tokens — source: §4.6 / §5 #14; done: one rule block per selector, zero raw hexes in that module.
- [ ] Verify hero/ticker mobile: `home-breaking-ticker.tsx:19-28`, `home-breaking-ticker.module.css`; mobile shrink already at `:18` (`min-height:44px; margin-top:12px; border-radius:14px; svg 14×14; label .58rem; items .78rem; pause min-width:44px`); `.58rem` ≈ 9.3px label and `.78rem` = 12.5px text are below readable floor, target 11px floor; two identical `@media(max-width:520px)` blocks at `:14` and `:18` with `:14` dead; `:2 .label { background:#ad3030 }`, `:7 content:"◆"; color:#ffc968` off-palette and `◆` is Unicode, not the mandated SVG icon; `:12` focus ring `#ffcf69` off-palette; radius 12px → 14px adds a value; reduced-motion fallback good (`:15` converts ticker to scrollable) — source: §4.6 / §5 #12; done: merged ticker upgrade uses 12px base / 11px floor ≤520px, SVG bullet, tokens, one media block; re-verify on current main.
- [ ] Verify keyboard visibility of ticker controls: `hero-logo.css:9,11` use `clip-path:inset(50%)`, which clips the whole 44×44 button to zero area — source: §4.6; done: `:focus-visible { clip-path:none }` present and keyboard screenshot proves visible focus.
- [ ] Confirm the merged ticker behaviour: Pause button + `paused` state + `.banner:hover` freeze removed; `animation:scroll 18s linear infinite` runs on load; `:focus-within .track { animation-play-state:paused }` kept for WCAG 2.2.2; reduced-motion disables animation and makes the viewport scrollable; duplicate `aria-hidden` `<ul>` retained for the seamless loop — source: §4.12 / task context; done: merged; unit test exit 0 (1/1) and browser check on current main.

### Chunk 5.6 — Responsive, contrast and a11y (§4.6, §7)

- [ ] Record computed contrast results: Midnight on Cobalt 4.84:1 ✓; Royal Steel on Cloud 7.60 ✓; Silver on Navy 6.93 ✓; Ice Blue on Navy 8.46 ✓; Cloud on Navy 13.49 ✓; Cobalt on white 3.90, fails 4.5 for body text (fine for large text/UI); focus ring Cobalt 3.90 ✓; semantic success/warning/error on white 6.04/5.93/6.49 ✓. Locked palette is compliant; failures come from off-palette hexes — source: §4.6; done: contrast report after token migration shows no off-palette failure.
- [ ] Fix every sub-44px target: `sponsor-popup.module.css:2` 36px; `native-controls.css:105-119` file-selector 36px; `globals.css:248` footer links 40px; `globals.css:330` comment-delete 40px and `:345` 36px; `native-controls.css:53-54` checkbox/radio 20px — source: §4.6 / §7 Fitts's FAIL; done: computed target sizes ≥44px at pointer:coarse, with spacing exception documented if used.
- [ ] Confirm focus handling: `globals.css:85`, `admin/globals.css:22`, `sponsor-popup.module.css:2` 3px cobalt, `branded-dialog.tsx:36,41` native `<dialog>` plus focus restore; no `outline:none` in main CSS — source: §4.6; done: keyboard walkthrough record.
- [ ] Fix the real overflow instead of hiding it: `navigation-refinement.css:85` uses `overflow-x:hidden` on `.site-main` at ≤767px, the exact band-aid the standard forbids because it can clip focus rings and sticky elements; admin tables `min-width:680px` in `overflow-x:auto` (`admin/globals.css:85,91`) are intentional and fine — source: §4.6 / §5 #11; done: no horizontal overflow at 320px without `overflow-x:hidden`.
- [ ] Normalise breakpoints: current mix 350/420/440/480/520/600/640/760/800/960/1024 vs mandated 320/768/1024/1440; at 320px gutter 16px ✓ and auth ≤350 handling ✓ but newsletter 10px inset ✗ and ticker label 9.3px ✗ — source: §4.6 / §4.7 smoke config; done: five-width matrix passes with keyboard, focus, screen-reader semantics, reduced motion and reflow.

### Chunk 5.7 — UX law violations and verdicts (§4.6, §7)

- [x] Record the designer's violation table with fixes (source: §4.6; done: each item re-verified on current main):

| law | component | file:line | fix |
| --- | --- | --- | --- |
| Closure | home story list / hero carousel | `hero-logo.css:73`, `hero-carousel.tsx:125` | no next-card peek; only `dashboard.module.css:338` does it (`grid-auto-columns:minmax(260px,82%)`). Use `minmax(0,68%)` + `scroll-snap-align:start` so ~32% peeks |
| Figure-ground | dialogs / drawer | `native-controls.css:241-245`, `navigation-refinement.css:43`, `admin/globals.css:118` | backdrop .58/.56 ✓; staff drawer .48 too weak → raise to .56+ |
| Banner blindness | home sponsor vs cookie notice | `page.tsx:111-112`, `notice-refinement.css:13-24` | sponsor directly above CookieBanner; separate by ≥1 section, give notices solid left accent `--ep-notice-accent`, no dashed/gradient |
| Parkinson's | auth/enquiry/profile ✓; gaps | `order-request-form.tsx:4` (`contact_name`), business submit, tourism/history forms | add `autoComplete` per H98 |
| Connectedness | enquiry ✓; business/editor ✗ | `globals.css:419`, `enquiry-form.tsx:38` vs `business-form.module.css:6-7`, `progressive-editor.module.css:6-7` | reuse the connecting-line stepper markup |
| Choice overload | home first fold | `page.tsx:30-32,45,48-55,106-107`; `directory.module.css:13` | hero CTA + radio CTA + 6 shortcuts + community CTA + popup + bottom nav compete; cut shortcuts to 3–4, group categories |

- [x] Record the §7 verdict table: Proximity FAIL (inset 8–14px vs label gap 4px, 22 cases); Closure FAIL (`minmax(0,68%)` + `scroll-snap-align:start`, 32% is a design decision); Figure–Ground PARTIAL (drawer .48 → ≥.56); Banner Blindness FAIL (separate ≥1 section, solid left accent, no dashed/gradient); Connectedness FAIL (reuse connected markup); Parkinson's PARTIAL (add `autoComplete`, never quote "30 keys → 7 keys" as law); Choice Overload FAIL (10+ competing choices, jam-study numbers verified); Fitts's FAIL (36/40px targets, 44×44 is AAA not AA); Good Continuation / Common Fate / Similarity MIXED (stepper in one form only, ~404 hardcoded colours); Peak–End / Aesthetic-Usability AT RISK (no success handoff, hero carousel no `onError`/empty state); Doherty UNMEASURED (health endpoint targets <400ms, add real timing for search/RPC); Jakob's PASS (cart-style conventions, standard nav, safe back button, familiar auth) — source: §7; done: recorded and each FAIL/PARTIAL actioned in its chunk.
- [ ] Record the report rule: qualitative laws are citable; 48px/32% peek, 70% scrim and 30→7 keys are project decisions, not law-derived facts, and must not be presented as research in client docs — source: §7 closing rule; done: client docs reviewed.

### Chunk 5.8 — Storefront gap reference and visual-upgrade verification (§4.6, §4.12)

- [ ] Record the storefront gap for Phase 7 action: `docs/handoffs/2026-11-form-sponsor-storefront.md:9-11` says explicitly "This is not an owner-managed storefront or premium subscription." Current: submission form accepts an HTTPS website, public pages use a slug and a generic `is_verified` badge (`directory.module.css:14`, `business-directory/page.tsx:34`). Missing entirely (no route/component found): auto-created slug `epelawa.vercel.app/Epe-lawa`; owner mini-admin in dashboard; profile-picture upload with validation; editable business info; X/Telegram/Facebook verified badges (only phone/WhatsApp present); premium subscription lifecycle + webhook verification. All must wait for schema reconciliation and isolated rehearsal per handoff:9-10 — source: §4.6 / §6; done: Phase 7 gates satisfied before any UI is built.
- [ ] Record the merged visual upgrade scope from §4.12: tokens-first, no new brand, no copied assets, 17 files changed on `feat/visual-upgrade`; hero blur/filter + 900ms stagger deleted → 8px/320ms/40ms stagger; radio-player off-palette hexes → tokens and `.waveLeft` restored; sponsor popup `role=status`, 24px/240ms rise, 44px CTA, "Patronise this local business"; footer ad clears cookie notice; SVG arrows in sponsor slot — source: §4.12 / task context; done: merged; re-verify each item on current main.
- [ ] Re-run the visual branch verification on the clean environment: the original run was MIXED and environment-compromised (typecheck exit 0, ticker unit test exit 0, but `pnpm build` failed `sh: turbo: not found`, final re-runs failed with empty `typescript/bin`; `pnpm test:node` = 321/304/17; full vitest `--pool=threads` 23 pass/6 fail; browser smoke + founda-scan not run) — source: §4.12; done: fresh full green run post-reinstall; do not treat the old numbers as verified.

---

## PHASE 6 — Feature completion and half-wiring

Scope: turn code-complete areas into live-working areas after Phase 2, and close the developer's 10-group work list.
Entry condition: Phase 5 design gates pass; Phase 1 schema reconciliation complete for the area being worked.
Exit/done condition: each area passes a real production workflow, not a PGlite stub; no fabricated content added.

### Chunk 6.1 — Current status from the developer's list (§2.1)

- [ ] News: newsroom redesign, public search, latest-news homepage, faster breaking ticker and signed-in Discover search merged; still open: staff-selected featured stories, breaking-story deduplication, full Discover visual parity — source: §2.1; done: each open item closed in chunk 6.2 with evidence.
- [ ] Business directory: redesigned frontend merged but production still missing business tables and published view; candidate migration not applied, so directory and submissions are not fixed — source: §2.1; done: Phase 1 reconciliation applied by owner, then end-to-end discovery/submission test.
- [ ] Forms and support: private intake, staff enquiry queue, progressive form work and movable support launcher merged; real submission-to-inbox and staff workflows still need testing — source: §2.1; done: real inbox tests (owner-only in Phase 9, agents prepare the checklist).
- [ ] Radio: redesigned player merged; Guts FM playback unverified, last provider lookup returned no matching station — source: §2.1; done: Owner decision O12 plus stream verification.
- [ ] Deployment: when checked, production deployment for PR #183 was still building; PR #182 was ready and promoted; a ready deployment does not prove workflows work end to end — source: §2.1; done: real workflow test on the deployed SHA.

### Chunk 6.2 — Remaining work groups 1-5 (§2.2)

- [ ] Group 1 Business directory (blocked): review/rehearse candidate schema, permissions, submission limits, staff approval and atomic verification; establish backup/recovery and rehearsal environment (Supabase branching refused on current plan); confirm whether the earlier reported submission can be found (recovery NOT established); verify anonymous discovery, verified-member submissions, staff review, approval and notification emails end to end; add real business photos and hours where available, an area selector and incorrect-information reporting workflow; resolve sponsorship disclosure and effect of removing old marketplace/review UI; keep Phase 1 focused on discovery and contact, no invented businesses/photos/verification — source: §2.2 #1; done: each sub-item evidenced; schema applied only by owner.
- [ ] Group 2 Newsroom and news discovery: add authorized staff-selected featured-story workflow; prevent duplication between breaking banner, featured story and cards without losing stories when breaking expires; complete signed-in Discover visual parity (search behaviour aligned in PR #183, production browser verification remains); test direct links, navigation, back/forward, scroll restoration, category controls, empty/error states and mobile accessibility; verify bylines, reading time, related stories, cover fallbacks, credits, canonical metadata and actual social-sharing previews; review additional article presentation styles against a11y and real content; verify breaking labels and admin controls using published, authorized and unexpired stories — source: §2.2 #2; done: per-item browser evidence at five widths.
- [ ] Group 3 News content and editorial operations: research, verify and publish the requested 15 additional real articles through the authorized workflow (last check did not establish publication, needs fresh content audit); verify dates, claims, sources, bylines, image rights and genuine breaking qualification; verify newsroom access and publishing with an authorized staff account — source: §2.2 #3; done: content audit plus owner/staff actions in Phase 9; agents do not invent content.
- [ ] Group 4 Newsroom authoring and media: finish progressive create/edit flow and private autosave/recovery without publishing recovery content; complete accessible upload/edit dialogs, validation, progress, error recovery and server-confirmed feedback; verify storage permissions, file validation, image processing, cleanup, accessibility descriptions and attribution; preserve SEO, cover and rights metadata while simplifying the editor; define and implement safe revision-checked public edits, article and secondary-image deletion, reuse behavior and audit; define scheduling with timezone, cancellation, retries, authorization and audit; complete admin social settings and authenticated staff password-change flow; keep remote URL handling protected against SSRF — source: §2.2 #4; done: per-item PR plus tests; flag auth and data-deletion paths before touching.
- [ ] Group 5 Forms, email and support: test newsletter signup, confirmation, duplicate requests and unsubscribe with a real inbox; test contact, advertising, corrections and support submissions through to private staff queue; verify staff access, resolution and audit records plus Gmail notifications and acknowledgements; finish progressive approach across complex forms including advertising WhatsApp and contact details; complete durable support ticket tracking, replies, status/resolution search and operational handling (current intake issues a ticket number but is NOT a full ticketing system); test movable support button on mobile, keyboard and across routes; apply and schedule reviewed retention cleanup, define enquiry retention/deletion and add alerts for failed delivery, backlogs and cleanup — source: §2.2 #5; done: real-inbox evidence (owner in Phase 9), code readiness evidence (agents).

### Chunk 6.3 — Remaining work groups 6-10 (§2.2)

- [ ] Group 6 Database and security: reconcile production schema and migration ledger (historical versions differ from filenames, some local timestamps collide, no bulk replay); establish and rehearse backup/restore and review RLS, grants, RPCs, storage policies, trusted-proxy identity and abuse controls; complete broader security assessment of auth, staff capabilities, secrets, payments and protected actions; review report-only CSP before enforcement; review prepared member messaging/deletion migration separately (unapplied due to deletion, storage, broadcast and idempotency concerns); record the correction that `article_set_breaking` IS present in production and its migration recorded, but an authenticated real write has not been verified — source: §2.2 #6; done: Phase 2 and Phase 3 evidence.
- [ ] Group 7 Identity, members and staff: verify signup, sign-in, OTP, recovery, session expiry and member/staff isolation; test staff roles, capabilities, revocation, stale revisions and audit on protected actions; complete username uniqueness, availability and anti-enumeration review; verify saved stories, notifications, profile updates and offline-reading behavior; complete safe member messaging and account-deletion design before enabling destructive operations; custom Auth email-hook cutover remains deferred, provider configuration is not proof of email delivery — source: §2.2 #7; done: authorized staff/browser tests in Phase 9; flag auth and data deletion before touching.
- [ ] Group 8 Radio: investigate why provider lookup does not find Guts FM and verify actual stream before claiming it works; verify stream rights, availability, schedules and archive behavior; test reminder delivery and clearly communicate platform/delivery limitations; confirm redesigned player and controls on real mobile browsers — source: §2.2 #8; done: Owner decision O12 plus real-device check.
- [ ] Group 9 Other platform areas: audit and complete real workflows rather than assuming a page is operational — Itàn Ilú Mi private submissions/media, consent, rights, provenance, review and corrections; Forum posting, polls, moderation, authorization and abuse controls; Map safe directions with Maps/Places/geocoding only under an approved provider; Tourism sourced records, submissions and moderation; Who Is Who verified profiles, review and corrections; Storage and payments test uploads/access policies and verify Paystack sandbox, webhooks and payment flows before claiming or enabling payment functionality; Analytics define purpose, access, consent, disclosure and retention, noting article view counts are NOT live visitor or geographic analytics — source: §2.2 #9; done: per-area real workflow evidence; flag payment/money-table paths before touching.
- [ ] Group 10 Dependencies, legal and release verification: resolve or safely mitigate the reported high-severity `picomatch` advisory with a fresh audit (resolved per §4.8 and §11, tracker still stale); restore or replace missing `scripts/audit/run.mjs` if absent (done per §4.11); complete privacy, terms, moderation, retention, image-rights and Nigerian legal review; verify domain, DNS and TLS if custom-domain launch intended; run full route and role matrix at 320, 375, 768, 1024 and 1440px including keyboard, focus, screen-reader semantics, reduced motion and reflow; test loading, empty, denied, error, success and provider-failure states; run full builds, tests, browser smoke and security gates on exact release candidate then verify deployed commit and real public/authenticated workflows — source: §2.2 #10; done: Phase 4 and PROJECT FINAL GATE evidence.

### Chunk 6.4 — Completeness counts and feature matrix (§4.4)

- [ ] Record executive counts: ~277 source TS/TSX files excluding `.next` and `node_modules`, ~14,700 LOC; 8 current-release web areas; 8/8 with real DB code and honest states; at least 6/8 BROKEN against live Production (News, History, Forum-poll paths, Business/Marketplace, Tourism, Who-is-Who writes); 20 `/admin` same-origin re-export shims plus error/not-found re-exports and 1 deliberate `notFound()` catch-all; 88 `.rpc(...)` call sites in TS; 133 SQL function definitions across 52 local migration files plus proposals/reconciliation; 2 RPCs called from TS but defined only in a reconciliation candidate (`business_review_decide`, `business_discovery_search`); Vitest 43 files (+1 mock), frontend `node:test` 71, backend `node:test` 22; Playwright 7 public `.spec.ts` + 1 admin `.admin-smoke.ts` (+4 helpers); 52 local migrations vs ~35 remote with no byte-identical files (`2026-11-18-migration-reconciliation-status.md:3`, orchestrator counted 55 entries); 2 duplicate timestamps `20261107213000`, `20261114190000` (`2026-11-20-migration-inventory.md:71`); 6 deliberate "Coming Soon"/disabled affordances; outright fake content NONE; no area provably production-COMPLETE — source: §4.4 executive counts; done: baseline appendix.
- [ ] Re-verify and close the 21-row feature matrix (source: §4.4; done: per-row status change with evidence): 1 Trending News BROKEN live/PARTIAL code (`main/app/news/page.tsx:124` selects `cover_url`; `20261115093000_news_cover_urls.sql` absent from ledger → 42703 per `2026-11-15-full-project-handoff.md:9,20-21`); 2 Itan Ilu Mi BROKEN live/PARTIAL (`main/app/itan-ilu-mi/page.tsx`, `actions.ts`; corrections honestly "Unavailable" at `:69-74`; `history_records`, `history_record_sources`, `history_contributions` absent live per `2026-11-20-migration-inventory.md:79`; `history.review` absent); 3 Forum BROKEN live polls/PARTIAL (`main/app/forum/actions.ts:32,54`; `forum_polls`, `forum_poll_options`, `forum_poll_votes`, `forum_poll_results` absent; `forum_vote` cannot run alone); 4 Map & Navigation COMPLETE (safe outbound Google Maps URLs only, no API key, `main/app/map/map-search.tsx:8-21,55`, no fake pins); 5 Business Directory BROKEN live/PARTIAL (`main/app/business-directory/page.tsx:19`, `order-actions.ts:12`; `businesses`, `products`, `orders`, `business_categories`, `business_featured`, `order_items` absent; RPCs only in `backend/supabase/reconciliation/business_discovery_candidate.sql:58,73`); 6 Tourism BROKEN live/PARTIAL (`tourism_destinations`, `tourism_submissions` absent; `tourism.review` absent); 7 Radio PARTIAL → near COMPLETE (`main/lib/radio-lagos.ts`, `guts-radio.ts`, `main/api/radio/guts/route.ts`, `radio-player.tsx:10,57`; prior Vercel TS failure fixed in source at `:10`; rights/schedule/archive incomplete); 8 Who is Who PARTIAL (read tables exist, staff write RPCs `people_update`, `people_verify` absent live); 9 Member auth PARTIAL (`auth/actions.ts:36-175`, `auth/callback/route.ts:17-34`, `auth-mail-hook.ts:18-40`; provider delivery UNVERIFIED); 10 Staff session & capability authz COMPLETE code/UNVERIFIED live (`admin/lib/supabase-access.ts:204-332,388-493`, `admin/components/admin-access-guard.tsx:7-39`, `session-guard.tsx:57-133`, `session-policy.ts:6-26`); 11 Admin app duplication PARTIAL (20 shims e.g. `main/app/admin/(protected)/page.tsx:1`, layouts `main/app/admin/layout.tsx:2-4`, `(protected)/layout.tsx:1-4`, catch-all `[...unknown]/page.tsx:3-4`); 12 News publishing BROKEN live/PARTIAL (`admin/lib/actions.ts:164,217,255,320,349`; cover RPCs/column absent → 42703 class); 13 Newsletter STUBBED + live security hole (`newsletter/actions.ts:25,41`, `newsletter-form.tsx:10-13`; live anonymous `newsletter_subscribe_request` token-replacement unresolved, `20261118030000_newsletter_subscriptions.sql:39,100` grants anon execute; local `20261118053000_pause_unsafe_newsletter_signup.sql:5` NOT deployed); 14 Contact/correction/advertising intake STUBBED (`ENQUIRY_INTAKE_ENABLED` off at `enquiry/actions.ts:7`; `contact/page.tsx:19-31`; `support/page.tsx:8`); 15 Maintenance gate PARTIAL (`settings/maintenance-actions.ts:12`; migration applied remotely `20261120072400`; `MAINTENANCE_GATE_ENABLED=false` at `.env.example:83`; Vercel activation + E2E outstanding); 16 Admin analytics PARTIAL (`admin/app/(protected)/page.tsx:18` real counts; graphs/real-time/country metrics NOT built); 17 Branded transactional email PARTIAL unverified (templates + signature verification + Gmail/Resend selection; delivery not evidenced); 18 Payments/Paystack MISSING by design (env keys documented, AGENTS.md §3 forbids claiming operational, order code exists, schema absent); 19 Native mobile apps MISSING deferred (AGENTS.md §1); 20 Six section-5 future enhancements MISSING roadmap; 21 Migration ledger/deploy automation BROKEN (no byte-identical files, 2 collisions, no backup/rehearsal).

### Chunk 6.5 — Half-done wiring and honesty (§4.4, §6)

- [ ] Close the 12 exact half-wiring items (source: §4.4; done: per-item evidence): 1 schema drift primary blocker, live DB lacks `history_records`, `history_record_sources`, `history_contributions`, `tourism_destinations`, `tourism_submissions`, `products`, `orders`, `order_items`, `business_featured`, `business_review_moderation_history`, `forum_polls`, `forum_poll_options`, `forum_poll_votes`, `forum_poll_results` (`2026-11-20-migration-inventory.md:79`, `2026-11-15-production-route-schema-gaps.md:13-28`); 2 News `cover_url` split-brain (`news/page.tsx:124` vs missing migration → 42703); 3 two RPCs only in a non-deployable candidate (`business_review_decide` at `admin/app/(protected)/business-review/actions.ts:22`, `business_discovery_search` at `main/app/business-directory/page.tsx:19`, defined only in `backend/supabase/reconciliation/business_discovery_candidate.sql:58,73`); 4 admin duplication, 20 shims, changes must be made in `frontend/apps/admin`; 5 duplicate migration versions `20261107213000`, `20261114190000`; 6 newsletter pause not deployed; 7 maintenance applied but not activated; 8 member messaging/deletion candidate not release-ready (direct `auth.users` deletion, Storage objects, broadcast idempotency, 10,000-recipient cap per `2026-11-member-messaging-draft.md:3,6-10`); 9 two capability paths, both must pass; 10 env/doc drift (`SUPABASE_PUBLISHABLE_KEY` not in root `.env.example`, `pnpm-workspace.yaml.bak` leftover); 11 hard-coded owner email in `20261114190000_configurable_staff_roles.sql:18`; 12 no verification the RadioPlayer fix shipped.
- [ ] Record fake/mock content NONE and preserve the honest placeholders: Google sign-in disabled + "Coming Soon" (`admin-login-form.tsx:46-48`, `auth-forms.tsx:156-158`); contact "No message is received" (`contact/page.tsx:19-31`); newsletter unavailable (`newsletter-form.tsx:5,10-13`); secure report coming soon (`guidelines/page.tsx:35`); About badge (`about/page.tsx:45`); support disabled (`support/page.tsx:8`); Guts FM error state (`radio-player.tsx:57`); catalogue cover labelled illustrative (`news-covers.ts:2`); 52 real credited photos with credits off-hero (`home-refresh.spec.ts:87`); 4 maintenance illustrations labelled AI-generated, not real events; browser-smoke synthetic key `browser-smoke-placeholder-not-a-secret` (`playwright.smoke.config.ts:11`); `editorial_prototype_*` in proposals; business candidate isolated and NOT deployed; archive docs labelled archive — source: §4.4 / §6; done: no fake metrics, testimonials, social icons, prices, reviews or coordinates introduced by any PR.
- [ ] Record the docs-vs-code verdicts: `AGENTS.md:1-4` VERIFIED; `2026-11-20-migration-inventory.md:79` VERIFIED; `:75` RadioPlayer Vercel failure CONTRADICTED in current source but deployment UNVERIFIED; `:71` duplicate timestamps VERIFIED; `2026-11-18-continuation-next-steps.md:8` newsletter vulnerability VERIFIED in source; `:7,23` picomatch GHSA high UNVERIFIABLE from source; `2026-11-15-full-project-handoff.md:20-21` news routes PARTIALLY VERIFIED; historical `.env.example` claim CONTRADICTED by current file — source: §4.4; done: doc alignment PR.

### Chunk 6.6 — §6 half-baked inventory (§6)

- [ ] Close the 8-area half-baked table: News BROKEN live (`cover_url` 42703, featured workflow open, breaking/featured/card duplication unresolved, Discover parity open); Itan Ilu Mi BROKEN live (`history_*` + `history.review` absent, corrections "Unavailable"); Forum BROKEN live polls (`forum_poll_*` absent, `forum_vote` cannot run alone); Business Directory BROKEN live (`businesses/products/orders/...` absent, 2 RPCs only in non-deployable candidate, Phase 1 discovery redesign only); Tourism BROKEN live (`tourism_*` + `tourism.review` absent); Who Is Who PARTIAL (reads work, `people_update`/`people_verify` absent); Radio near COMPLETE (streams verified, compact player in source, rights/schedules/archive open, Guts lookup previously failed, no measurable height target); Map COMPLETE, the one finished area — source: §6; done: per-area live verification.
- [ ] Close the cross-cutting half-wiring: 20 admin shims (edit `frontend/apps/admin`, not the shim); newsletter UI gated off but live RPC exposed; contact/corrections/advertising/support intake gated off with contact page saying "No message is received" and support not a ticketing system; maintenance gate applied but `MAINTENANCE_GATE_ENABLED=false` and Vercel activation + E2E outstanding; member messaging/deletion unapplied; payments env/schema present but no runtime handler and sponsorships cannot activate without webhook; auth code complete but provider delivery and real browser staff login unverified; admin analytics real counts only; 6 deliberate "Coming Soon" affordances; storefront entirely missing; test gaps listed in chunk 6.7 — source: §6; done: each item closed or explicitly carried to Phase 7/9.
- [ ] Record the dominant pattern for the release notes: code-complete / integration-incomplete, real DB calls and fail-closed gates with no fabricated content, but at least 6 of 8 flagship areas cannot work live because the production schema was never reconciled — source: §6; done: release note language reviewed.

### Chunk 6.7 — Test coverage map and gaps (§4.4)

- [ ] Preserve the strong contracts: Vitest 43 files cover open-redirect rejection, mail-hook signature/tamper/stale-token, form-server fails closed without Vercel header, newsletter confirm/unsubscribe, business verified-badge gating, breaking news, cover validation, session recovery, progressive forms, maintenance, guts radio, recommendation ranking (refuses fabricated zeros); frontend `node:test` 71 files are source-contract/static-analysis tests; backend `node:test` 22 files are PGlite SQL isolation with stubbed auth/capability/audit, NOT Supabase/PostgREST, which is why schema drift went undetected; Playwright 7 public + 1 admin run at 1280×900 with synthetic Supabase stub, widths parameterized per spec, covering keyboard/focus, reduced motion, hydration errors, overflow and honest empty/error states — source: §4.4 test coverage map; done: coverage appendix.
- [ ] Close the critical gaps: NO end-to-end test of real member signup/OTP/login or staff password login; NO test against live Production catalog; NO Playwright E2E for the 8 feature areas (contribution, thread/vote, tourism submission, business submission/order, Who-is-Who verification); NO test that the vulnerable newsletter RPC is revoked in a real DB; no single config constant enumerating all five required widths; no coverage report artifact — source: §4.4 critical gaps; done: five-width constant plus E2E specs plus coverage artifact produced.
- [ ] Record the explore specialist's bottom line: code-complete / integration-incomplete, not done; honest and well-engineered at code level but 6+ of 8 flagship areas cannot work against the live database, two security items remain open (newsletter RPC, picomatch), and deployment evidence (builds, provider delivery, browser staff flows) is missing — source: §4.4 bottom line; done: tracked in Phase 3/4/Final Gate.

---

## PHASE 7 — Storefront (owner-gated, after schema stable)

Scope: build the owner-managed storefront only after Phase 1 schema and Phase 3 security gates are signed off.
Entry condition: schema reconciliation reviewed, storage baseline defined, owner decisions O5 and O11 recorded.
Exit/done condition: schema, RLS, storage policies and webhook verification reviewed; no fake badges, no client-trusted payment status.
FLAG: this phase contains auth, payment and data-deletion paths, all three.

### Chunk 7.1 — Storefront contract (§3 #9, §4.6, §8 Phase 6)

- [ ] Confirm the owner's requested contract: business owners attach a website link OR use an auto-created storefront slug (`epelawa.vercel.app/Epe-lawa`) managed from a user-dashboard mini-admin with profile picture, business info, verified badges (X/Telegram/Facebook) and premium subscription — source: §3 #9; done: written contract in the PR; no invented fields.
- [ ] Record that the current implementation is NOT this: handoff `docs/handoffs/2026-11-form-sponsor-storefront.md:9-11` says "This is not an owner-managed storefront or premium subscription"; only HTTPS website submission, slug and generic `is_verified` badge (`directory.module.css:14`, `business-directory/page.tsx:34`) exist — source: §4.6 / §6; done: gap acknowledged before coding.
- [ ] Do not build UI against unverified schema; all storefront work waits for schema reconciliation and isolated rehearsal per handoff:9-10 — source: §4.6 / §8 Phase 6; done: Phase 1 sign-off recorded.

### Chunk 7.2 — Storefront build gates (§8 Phase 6, §4.3 payment safety)

- [ ] Implement auto-slug and owner mini-admin in dashboard with server-side ownership checks — source: §8 Phase 6; done: authz review with file:line, owner-only writes, no IDOR. FLAG: auth path.
- [ ] Implement profile-picture upload with MIME/extension/size validation and safe filenames, plus storage RLS baseline — source: §8 Phase 6 / §4.3 LOW-5; done: upload security test and storage policy review; no `storage.objects` policy added without sign-off.
- [ ] Implement verified X/Telegram/Facebook badges from verified server-side data only; no client-trusted badges — source: §4.6 / §8 Phase 6; done: badge gating test.
- [ ] Implement premium subscription lifecycle with server-verified webhooks and idempotency; never trust client payment status — source: §8 Phase 6 / §4.3 payment safety / Owner decision O11; done: signed webhook verification, replay-safe event IDs, server-side amount/currency checks; no money-table change without owner approval. FLAG: payment and money-table path.

---

## PHASE 8 — Content, legal, release, PR and deployment

Scope: finish content and legal review, consolidate branches, enforce the PR gate, and record the exact release SHA.
Entry condition: Phases 1-7 done conditions met with link-backed evidence.
Exit/done condition: GitHub shows all required contexts success, Vercel shows a successful production deployment on the exact release SHA, PR fully mergeable, no errors.

### Chunk 8.1 — PR and deployment state (§10)

- [ ] Record baseline PR/deployment state: no open PRs at audit time (`gh pr list --state open` → `[]`), current main was `49bf9d8`, CI red, branch unprotected; nothing committed by the audit agents; three isolated working trees off `49bf9d8` (`/public/EPE-LAWA` on `fix/migration-reconciliation` recon doc untracked; `/public/EPE-LAWA-SEC` on `security/headers-health`; `/public/EPE-LAWA-VIS` on `feat/visual-upgrade`); all merged via the remediation PR and PR #192 (`05efaf5` / `1f6f6aa`) since — source: §10 / task context; done: current `git log --first-parent -n 10` output recorded.
- [ ] Enforce the visual-upgrade guardrail: the master standard bans excessive glassmorphism/glow/gradients/decorative motion; the brief requires purposeful blur (Figure–Ground), transform/opacity-only motion, `prefers-reduced-motion` on every animation, ≤3 radii and tokenised colour, not a generic AI look — source: §10; done: code review sign-off on current main.
- [ ] Account for the 4 staged-deleted root `.jpg` before any integration PR; they were not the audit agent's deletion and were intentionally untouched in the worktree; exclude them from the PR until manually reviewed — source: §10 / Owner decision O9; done: owner visual review and explicit include/purge decision.
- [ ] Keep green Vercel contexts distinct from production: #183/#182/main showed Vercel success on preview branches while CI/smoke failed, and no GitHub Deployments promotion records exist — source: §10 / §4.8; done: final gate requires a production deployment on the exact release SHA.
- [ ] Enforce the manual PR rule because `protected:false`: feature branch → PR → all contexts green + review → merge → rerun checks on main; do not repeat #191 (merged with red checks) — source: §10 / §4.8; done: PR record with green context list.
- [ ] Record the delivery target verbatim: GitHub shows all required contexts success, Vercel shows a successful production deployment on the exact release SHA, and the PR is fully mergeable, before any phase is called done — source: §10; done: final gate table.

### Chunk 8.2 — PR consolidation plan and merge gates (§10)

- [ ] Consolidate the 6 source branches into one integration branch named per repo AGENTS.md §5, `feat/full-web-implementation`, conflict-safe because all branches share base `49bf9d8` — source: §10 consolidation plan; done: integration branch exists with all 6 changes; note current main is now `05efaf5`, so rebase/merge from current main and re-verify.
- [ ] Verify each source gate before merging into integration: `security/headers-health` (health endpoint, `x-powered-by:false`, 308 redirect; focused tests + typecheck green per §4.9); `fix/ci-audit` (`scripts/audit/run.mjs`, wrapper verified real counts per §4.11); `fix/migration-source` (forward `must_change_password` migration, `schema.test.mjs` exit 0 from scratch); `fix/test-green` (test/harness fixes, `pnpm test` + `test:unit` exit 0); `feat/visual-upgrade` (tokens, motion, glass, ticker fix, typecheck + vitest + build exit 0); `fix/migration-reconciliation` (recon doc only, untracked, docs-only no conflict) — source: §10 table; done: per-branch command log; first three already merged per task context, so confirm on current main instead of re-doing.
- [ ] Exclude from integration: the 4 staged-deleted root `.jpg` and the 3 untracked app-level `node_modules` symlinks (environment artifacts, never stage) — source: §10; done: `git status --short` clean of both.
- [ ] Enforce all five integration→main merge gates: (1) `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm test:unit` exit 0 on exact integration head, freshly run, not cache-only for build; (2) browser smoke public config green across 320/375/768/1024/1440 with Playwright Chromium installed if needed; (3) `founda-scan --json` re-run with CRITICAL count not increased; (4) push integration branch, open PR, all GitHub contexts + Vercel preview green on PR head; (5) only then merge to main and rerun full verification on post-merge main; if any gate fails, NO merge, report the exact failure — source: §10 merge gate; done: gate log attached to PR.

### Chunk 8.3 — Content, legal and release (§8 Phase 7, §2.2 #3, #9, #10)

- [ ] Publish 15 real sourced articles through the authorized workflow with dates, claims, sources, bylines and image rights; fresh content audit first because the last check did not establish publication — source: §2.2 #3 / §8 Phase 7 / Owner item O6+ in Phase 9; done: content audit plus owner/staff publication evidence; agents invent nothing.
- [ ] Add real business photos and hours where available, tourism sourced records and moderation, and verified Who Is Who profiles — source: §2.2 #1, #9; done: owner-provided content evidence; no invented data.
- [ ] Complete privacy, terms, moderation, retention, image-rights and Nigerian legal review — source: §2.2 #10 / §8 Phase 7 / Owner Phase 9 #10; done: legal sign-off recorded.
- [ ] Verify domain, DNS and TLS if a custom-domain launch is intended; inspect Vercel dashboard config (build command, root, domains, redirects, CORS/callbacks, cron protection, storage permissions, rate limits, monitoring) — source: §2.2 #10 / §8 Phase 7 / Owner decision O13; done: dashboard inspection record, not inferred from GitHub contexts.
- [ ] Record the exact production SHA and read-only prod smoke, health endpoint check, uptime/error-rate alerts, and confirmation of no secrets in logs — source: §8 Phase 7 / §4.8 release gate #9; done: release record with SHA and GET-only evidence.

---

## PHASE 9 — WHAT ONLY THE OWNER / CLIENT CAN DO — AGENTS MUST NOT ACTION

Scope: owner-only and client-only work. Agents may prepare checklists and verify evidence after the owner acts, but must never perform these items, bypass them, or mark them `[x]` on the owner's behalf.
Entry condition: reached only after Phases 0-8 gates that depend on these items are ready.
Exit/done condition: every item has a written owner verdict or explicit deferral; no agent action recorded.

### Chunk 9.1 — Access, credentials and live accounts (§9 #1-5, #11-13)

- [ ] OWNER/CLIENT ONLY: grant Vercel project/team access to git author `Brave290` to clear the PR #192 FAIL "Git author Brave290 must have access to the project on Vercel to create deployments."; agents must not bypass, re-author commits, or claim deployment evidence — source: task context / Owner decision O1; done: owner confirms access and a green `Vercel` context on a named SHA.
- [ ] OWNER/CLIENT ONLY: visual-review the 4 JPEGs in git history; if they contain member/staff data, authorise `git filter-repo` purge (destructive history rewrite) — source: §9 #1 / §4.2; done: owner written verdict.
- [ ] OWNER/CLIENT ONLY: put real credentials in Vercel for every env name in §4.8, never in the repo and never pasted to an agent — source: §9 #2; done: owner confirmation, placeholders remain in `.env.example`.
- [ ] OWNER/CLIENT ONLY: run live inbox tests for newsletter confirm/duplicate/unsubscribe, contact, advertising, corrections, support, Gmail notifications and acknowledgements — source: §9 #3; done: owner test record.
- [ ] OWNER/CLIENT ONLY: use an authorized staff account for browser login, role changes, capability revocation, article publishing and breaking flags; local tests are not proof — source: §9 #4; done: owner/staff browser evidence.
- [ ] OWNER/CLIENT ONLY: provide Vercel dashboard config access, domain/DNS/TLS decision, and Arena credentials or pasted text if that source is wanted — source: §9 #11-13 / Owner decision O13; done: owner provides or explicitly defers.

### Chunk 9.2 — Real content, backup and security policy (§9 #5-10)

- [ ] OWNER/CLIENT ONLY: supply real content: the 15 articles with dates, claims, sources, bylines and image rights, real business data/photos/hours, tourism records and Who Is Who profiles; agents will not invent any of it — source: §9 #5; done: content delivered and published through the authorized workflow.
- [ ] OWNER/CLIENT ONLY: sign off backup and restore rehearsal, confirming a real production backup exists and has been restored once before any migration PR merges — source: §9 #6 / §8 Phase 1; done: owner sign-off record.
- [ ] OWNER/CLIENT ONLY: make security-policy decisions: deploy the newsletter pause RPC, approve any member-deletion design, decide CSP enforcement timing, decide repo public vs GitHub Pro for branch protection — source: §9 #7 / Owner decisions O3, O7, O8, O10; done: four written decisions.
- [ ] OWNER/CLIENT ONLY: provide Paystack sandbox keys, webhook signing secret and idempotency review before enabling anything; payments are off by design — source: §9 #8 / Owner decision O11; done: owner decision recorded.
- [ ] OWNER/CLIENT ONLY: decide Guts FM stream rights, availability, schedule and archive behaviour; provider lookup previously found no match — source: §9 #9 / Owner decision O12; done: owner decision recorded.
- [ ] OWNER/CLIENT ONLY: complete legal review of privacy, terms, moderation, retention, image rights and Nigerian jurisdiction — source: §9 #10; done: legal sign-off.

### Chunk 9.3 — Merge authority (§9 #14)

- [ ] OWNER/CLIENT ONLY: make the final merge call for every PR; the vote or recommendation is not the decision — source: §9 #14; done: owner merge record per PR.
- [ ] Record that no agent merged directly to main during the audit and none may do so under this checklist — source: §10 / §9 #14; done: `git log --first-parent` review at final gate.
- [ ] Record native mobile as deferred until the website release gate passes; no mobile work in this checklist — source: §8 Phase 8 / §2.3; done: absence of mobile PRs at final gate.

---

## PROJECT FINAL GATE

Scope: full verification on post-merge main, browser smoke across all five widths, real scanner output, read-only production verification, docs sync, visual review and the four core values quality gate.
Entry condition: Phases 0-9 done conditions met; no known owner blocker unresolved except explicitly deferred items.
Exit/done condition: every checkbox in this section has named evidence; any failure blocks the release and is reported verbatim rather than merged.

### Chunk FG.1 — Full verification rerun on post-merge main (§10 merge gate, §4.8)

- [ ] Run `pnpm typecheck` on post-merge main and record exit 0 — source: §10 merge gate #1 / §8 Phase 3; done: command log with exit code.
- [ ] Run `pnpm build` with no cache on post-merge main and record exit 0 with a fresh `next build --webpack` compile — source: §10 merge gate #1 / §0; done: command log with `Tasks: 2 successful, 2 total` and zero cache hits.
- [ ] Run `pnpm test` and `pnpm test:unit` on post-merge main and record exit 0 with full counts; confirm all 13 TAP failures and the vitest failures are resolved — source: §10 merge gate #1 / §4.7; done: command logs with counts.
- [ ] Run `pnpm audit --audit-level=high` on post-merge main and keep the gate in CI — source: §4.8 / §4.11 / §11 row 1; done: command log, no vulnerabilities; tracker updated.
- [ ] Run `pnpm audit:ci` manually and report real output; do NOT wire it into CI while it is permanently red — source: §4.11; done: command log with CRITICAL/WARNING/INFO and exit code.
- [ ] Confirm all GitHub contexts and the Vercel preview are green on the exact PR head, then rerun verification on post-merge main — source: §10 merge gate #4-5 / §4.8; done: context table with SHA.

### Chunk FG.2 — Browser smoke and five-width matrix (§2.2 #10, §4.7, §4.8, §8 Phase 4/7)

- [ ] Install Playwright Chromium (CI installs Chromium) and run the 7 public specs with `playwright.smoke.config.ts` — source: §4.7 browser coverage / §4.8 / task context; done: smoke log 0 failed; widths 320/375/768/1024/1440 from the config.
- [ ] Run the admin smoke spec; admin config has no npm script, so invoke manually; it covers 1440×900 and 390×844 — source: §4.7; done: command log with pass count.
- [ ] Complete full browser smoke across 320, 375, 768, 1024 and 1440 CSS px for every route and role, including keyboard navigation, visible focus, screen-reader semantics, `prefers-reduced-motion` and reflow with no horizontal scroll — source: §2.2 #10 / §8 Phase 4/7 / §4.6 responsive; done: screenshot set per width plus a11y record.
- [ ] Verify all states: loading, empty, denied, error, success and provider-failure — source: §2.2 #10 / §8 Phase 7; done: per-state evidence in the release PR.
- [ ] Fix the known smoke failures before this gate passes: `dashboard-tabs.spec.ts:280`; five widths in `news-filter-navigation.spec.ts:6`, `:50`, `:74`; `public-routes-audit.spec.ts:55` radio heading `"Listen live."` not found — source: §4.8; done: smoke log showing all green.
- [ ] Confirm missing smoke evidence now fails the job (change `browser-smoke.yml:68 if-no-files-found: ignore`) — source: §4.8 / §5 #18; done: workflow diff plus a deliberate negative test.
- [ ] Re-verify the three GitHub contexts that were PENDING on PR #192 (`Browser smoke / public shell`, `CI / CodeQL security analysis`, `CI / verify`) are green on the final SHA once they complete — source: task context PR #192 check results; done: on PR #198 head `51a1231`, `CI / verify` is now PASS; `Browser smoke / public shell` and `CI / CodeQL security analysis` are still FAIL. CodeQL is blocked by owner repo settings (code scanning not enabled), browser smoke by timeouts/known failures. Not green — owner decision O13/repo settings required. Do NOT mark complete while red.

### Chunk FG.3 — Scanner and read-only production verification (§1.5, §4.10, §10)

- [ ] Run `founda-scan --json` on post-merge main and report the REAL output verbatim: files analysed, lines, coverage, CRITICAL/WARNING/INFO, health, readiness, layers flagged, VERDICT — source: §1.5 / §10 merge gate #3; done: new JSON file path and summary in the release record.
- [ ] Resolve every CRITICAL item, or produce a written triage classifying each as an isolated test fixture or false positive with justification; the 20 baseline items are listed in Chunk 1.4 — source: §1.5 / §8 Phase 2; done: CRITICAL count 0 or written justifications; no fabrication or suppression.
- [ ] Verify the admin-login and browser-smoke credential-shaped literals are synthetic fixtures, not live credentials, before downgrading them — source: §1.5 / §4.2; done: fixture file:line evidence.
- [ ] Perform read-only production verification only: GET route matrix, headers, `/api/health` 200, `/community-history` 308, no `x-powered-by`, source maps 403, no secrets in SSR payload — source: §4.10 / §4.9 / §10 release gate #9; done: curl log with status codes; no DDL, writes, seeds or test data.
- [ ] Confirm no production DDL, writes, seeds or test data were applied during the whole programme — source: §0 / §4.1 / task context; done: signed statement in the release record.

### Chunk FG.4 — Docs sync and 4 JPEG visual review (§12, §4.2, §10)

- [ ] Sync all docs with the shipped code in the same release PR: `docs/14-tracker.md` (withdrawn advisory, green statuses), handoff claims aligned with reconciliation, `.env.example` complete with one naming scheme, README note for `/api/health` — source: §12 one-line doc task list; done: doc diff reviewed against implementation.
- [ ] Confirm the four §2 working references and Tier 1 docs are current, and archive docs are still labelled historical, not active truth — source: §12 / §2 closing note; done: doc audit record.
- [ ] Complete the owner visual review of the 4 root `.jpg` and record the verdict: keep staged-deleted or authorise `git filter-repo` purge — source: §9 #1 / §4.2 / §10; done: owner written verdict; agents do not purge.
- [ ] Confirm the 3 untracked app-level `node_modules` symlinks and `pnpm-workspace.yaml.bak` are absent from the release tree — source: §4.9 / §4.4 / §10; done: `git status --short` output.

### Chunk FG.5 — Four core values quality gate

- [ ] USER-CENTERED: every shipped decision serves the actual user; forms, ads and navigation improve the real workflow rather than the demo — source: project quality standard; done: final walkthrough record.
- [ ] PIXEL PERFECT: precision in every detail across the five widths, with the 22 form-spacing cases, token radii and contrast verified — source: project quality standard / §4.6; done: screenshot set and computed-style log.
- [ ] PERFORMANCE FOCUSED: no obvious regressions, 8 preloaded CSS files reviewed, bundle-splitting decision recorded, search/RPC latency measured against the 400ms target — source: project quality standard / §4.10 / §7 Doherty; done: measurement log.
- [ ] FUTURE READY: scales with the business, no hard-coded single-account coupling introduced, no money path enabled without webhooks, mobile deferred cleanly — source: project quality standard / §4.4 / §8; done: architecture sign-off.

---

## COVERAGE MANIFEST

Every section of the master audit (§0-§12) is mapped below. No section was left unmapped.

| Report section | Captured in |
| --- | --- |
| §0 Executive verdict | Chunk 0.1, 1.1, 1.2, 1.4, 1.5, 2.3, 4.1, FG.3 |
| §1.1 Repository identity | Chunk 0.1 |
| §1.2 Toolchain and install | Chunk 0.1 |
| §1.3 Migration ledger critical finding | Chunk 2.1 |
| §1.4 Missing release tooling | Chunk 4.4 |
| §1.5 Mandatory scanner output | Chunk 1.4, 5.3, FG.3 |
| §1.6 Source inventory | Chunk 3.2 |
| §2.1 Current status | Chunk 6.1 |
| §2.2 Remaining work (all 10 groups) | Chunk 6.2 (groups 1-5), 6.3 (groups 6-10) |
| §2.3 Future ideas | Chunk 0.2, 9.3 |
| §2.4 Superseded statements | Chunk 0.2 |
| §2 Working references | Chunk 0.2, 0.4, FG.4 |
| §3 New requests (1-14) | Chunk 0.2, plus per-request phases: 5.4/5.5/5.7 (6,8), 7.1 (9), 9.1 (10), 8.3 (11), 1.2 (12), 4.3 (13), 3.3 (14) |
| §4.1 Database and migrations | Chunk 2.1, 2.2, 2.3, 2.4 |
| §4.2 Browser secret exposure | Chunk 3.1, 3.2, 4.5, 9.1 |
| §4.3 Broad security assessment | Chunk 2.3, 3.3, 3.4, 3.5, 3.6, 5.3 |
| §4.4 Codebase completeness / half-built | Chunk 6.4, 6.5, 6.6, 6.7 |
| §4.5 UX law research | Chunk 5.1 |
| §4.6 UI/UX + design-system audit | Chunk 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8 |
| §4.7 Build/test evidence | Chunk 1.1, 1.2, 1.3, FG.1, FG.2 |
| §4.8 CI/CD, Vercel, PR state | Chunk 4.1, 4.2, 4.3, 4.5, 4.6, FG.1 |
| §4.9 Health / headers implementation | Chunk 1.6, 2.2, 4.2 |
| §4.12 Visual upgrade + ticker | Chunk 5.3, 5.5, 5.8 |
| §4.11 Audit gate implementation | Chunk 4.4, FG.1 |
| §4.10 Orchestrator live-site checks | Chunk 1.5, FG.3 |
| §5 Things done wrong (1-20) | Chunk 2.1 (#1), 2.2 (#2), Owner decision O7 + Chunk 6.5 (#3), Owner decision O3 + Chunk 3.3 (#4), Chunk 4.1 (#5, #18), 4.4 (#6), 3.3 (#7), 1.6 (#8), 5.2 (#9), 5.3 (#10), 5.6 (#11), 5.5 (#12, #14), 5.4 (#13), 4.5 (#15, #20), 2.4 (#16), 3.2 (#17), 4.3 (#19) |
| §6 Half-baked code / features / wiring | Chunk 6.5, 6.6, 7.1 |
| §7 UX laws applied | Chunk 5.2, 5.4, 5.6, 5.7 |
| §8 Phased plan to finish the website | Chunk 0.5, 1.6, 2.1, 2.4, 3.2, 3.3, 4.5, 5.8, 6.3, 7.2, 8.3, 9.3, FG |
| §9 What only the owner/client can do | Chunk 3.2, 3.3, 6.2, 6.3, 8.3, Phase 9 (9.1, 9.2, 9.3) |
| §10 PR / deployment status | Chunk 4.2, 4.3, 4.6, 8.1, 8.2, FG.1, FG.4 |
| §11 Conflict reconciliation | Chunk 0.3, 2.2, 2.3, 3.3, 4.5, 5.1 |
| §12 Docs reading list | Chunk 0.4, FG.4 |

Additional coverage beyond the audit: Owner decisions O1-O14 in the DECISIONS NEEDED FROM OWNER section (O1 and the final-gate pending-context check added from the PR #192 task context).

---

## Chunk 10 — Admin redesign, R2 backup workspace and audit doc (2026-11-20)

Owner-directed execution phase. Branch `feat/admin-backup-redesign`; docs branch `docs/master-audit`; a11y branch `fix/a11y-touch-targets` (merged as PR #194, merge commit `5c3067690ba62d7588608ce183f106086a539c85`).

- [x] Ship the verified a11y/responsive fixes as PR #194 — evidence: `gh pr view 194 --repo epelawa/EPE-LAWA --json state,mergeCommit` → `MERGED`, merge commit `5c30676`; `git ls-tree -r --name-only origin/main` lists all six changed CSS files.
- [x] Put the full 970-line master audit under version control — evidence: commit `7b7a25b` on `docs/master-audit`, blob `610f6d2643ea6485f0f1e977b2fae00cc9dd1232` identical local vs `origin/docs/master-audit`, PR #195 OPEN. File: `docs/19-master-audit.md`. Secret-pattern scan found no credential values.
- [x] Confirm CI-pin and checklist commits reached main — evidence: `git merge-base --is-ancestor` exit 0 for `4f2f3cb`, `be1dc61` and `3fda8ef` against `origin/main`.
- [x] Redesign admin shared masthead and dashboard landing in cobalt palette — evidence: `frontend/apps/admin/app/globals.css` (masthead accent bar + label chip), `frontend/apps/admin/app/(protected)/page.tsx`, `frontend/apps/admin/app/admin-dashboard.module.css`. SVG icons only; 44px touch targets; reduced-motion rule retained.
- [x] Add R2 backup/restore workspace with strict gates — evidence: `backend/supabase/migrations/20261120170000_system_backup_capabilities.sql` (capability vocabulary only, no grants), `frontend/apps/admin/lib/backup-r2.ts` + `backup-dispatch.ts` (`import "server-only"`), `frontend/apps/admin/app/(protected)/backups/actions.ts` (fresh `has_capability`, exact-key type-to-confirm, automatic pre-restore snapshot, `audit_event`), `components/backup-controls.tsx`, `.github/workflows/db-backup.yml` + `db-restore.yml` (secrets live only in GitHub Actions).
- [x] Typecheck — evidence: `pnpm typecheck` → exit 0, `Tasks: 5 successful, 5 total`.
- [x] Production build — evidence: `pnpm build` → exit 0, `Tasks: 2 successful, 2 total`, `Time: 6m54.621s`, `/backups` present in route table.
- [x] Diff hygiene — evidence: `git diff --check` → exit 0.
- [x] `pnpm test` and `pnpm test:unit` run on this work — evidence: `pnpm test` exit 0 (`TEST_EXIT=0`), Node suite 349 total / 348 pass / 0 fail / 1 skip, Vitest 44 files / 127 tests pass — `/public/.cache/test-full.log`; `pnpm test:unit` exit 0 (`UNIT_EXIT=0`), 44 files / 127 tests pass — `/public/.cache/test-unit-full.log`. The earlier "ni test" instruction applied to the fast commit/PR phase only and was superseded by the owner's "full phas3s noww".
- [ ] Owner-gated and deliberately untouched: live DB migration application, any restore over production, Vercel access, capability grants for `backup.read/create/restore`, GitHub Actions secrets (`DATABASE_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_PRIVATE`, Vercel-side `CLOUDFLARE_API_TOKEN`, `BACKUP_DISPATCH_TOKEN`, `BACKUP_WORKFLOW_REPO`).

**Browser exposure rule (owner):** no DB URL, R2 write key, Cloudflare token or GitHub dispatch token in browser, devtools, RSC payload, action return or console. Only backup key metadata (identifier, size, timestamp) reaches the client; the key is required for typed confirmation. All signing and dispatch is server-only / GitHub Actions.

## Chunk 11 — Gallery navigation, tourism disclaimer cleanup, admin media workspace, backups mirror and professional roles UI (2026-11-21)

Owner-directed Phase 1 batch. Branch `feat/phase1-platform-fixes-20261121`, base `main` @ `83318d5`. No Production schema, data, account or environment changes made from this workspace.

- [x] Show `/gallery` in the footer QuickLinks and the mobile hamburger drawer across the platform — evidence: `["/gallery", "Gallery"]` added to `MOBILE_GROUPS` "Explore" in `frontend/apps/main/lib/mobile-navigation.ts` (drawer + footer) and to `DESKTOP_GROUPS` "Discover" in `frontend/apps/main/components/site-header.tsx`; regression file `frontend/tests/navigation-gallery.test.mjs`, `pnpm test` pass.
- [x] Remove the verbose Wikimedia Commons disclaimer blocks on Tourism — evidence: `frontend/apps/main/app/tourism/page.tsx` figcaptions reduced to one compact credit line (title · photographer · CC BY-SA 4.0 · `/photo-credits`); "Wikimedia Commons images shown for visual context only…", "Wikimedia Commons title: …", "Photograph by …." and "Source: Wikimedia Commons file. License: …." strings no longer render; regression file `frontend/tests/tourism-reference-photos.test.mjs`, `pnpm test` pass.
- [x] Diagnose the "Destinations could not be loaded" tourism error state — evidence: root cause is the missing Production table `tourism_destinations`; migration `20261107230000_tourism_sites.sql` classified NOT APPLIED in `docs/reconciliation/2026-11-20-migration-reconciliation.md` (line 86). Honest failed state retained; no unverified destination content invented. Application is owner-gated (see outstanding list).
- [x] Admin media management: upload to R2 and delete database records — evidence: additive migration `backend/supabase/migrations/20261121140000_media_administration.sql` (audited `media_asset_create`/`media_asset_delete` RPCs, capability-gated, execute granted to `authenticated` only); server-only `frontend/apps/admin/lib/media-r2.ts` (Cloudflare REST API, 404-as-removed, `unconfigured` without env); `frontend/apps/admin/app/(protected)/media/page.tsx` + `media-actions.ts` (size/MIME/alt validation, capability gates `article.create`/`radio.manage` for upload and `article.publish`/`radio.manage` for delete, in-use delete rejected with `media_asset_in_use`); admin nav entry in `frontend/apps/admin/lib/navigation.ts`; mirror `frontend/apps/main/app/admin/(protected)/media/page.tsx`; `/admin/media` added to `frontend/apps/main/public/manus-routes.json`.
- [x] Fix the missing `/admin/backups` route on the same-origin app — evidence: mirror `frontend/apps/main/app/admin/(protected)/backups/page.tsx` added; `/admin/backups` added to `manus-routes.json`.
- [x] Rebuild the roles/permissions UI professionally (no raw capability-key checkboxes) — evidence: `frontend/apps/admin/components/roles-capability-picker.tsx` with "Full access" master switch, per-group select-all, and human-readable labels in six groups; `advertise.manage`-style keys never displayed as labels; unknown catalogue keys fall into "Other" labelled from the DB description; `frontend/apps/admin/app/(protected)/roles/page.tsx` rewritten readably, still gated on `staff_roles_authorized`, staff assignments show `person.email` with unverified/inactive suffixes; styling in `roles.module.css`; regression file `frontend/tests/admin-roles-ui.test.mjs`, `pnpm test` pass.
- [x] Audit the maintenance-mode controller — evidence: gate confirmed fully wired: `frontend/apps/main/proxy.ts` (DB read per request, fail-closed, 503 + `Retry-After` + noindex), `maintenance_admin_status` / `maintenance_set` RPCs, admin settings toggle; migration `20261121120000_maintenance_mode.sql` classified APPLIED (reconciliation line 115). What remains is owner-gated activation only.
- [x] Typecheck — evidence: `pnpm typecheck` → exit 0, `Tasks: 5 successful, 5 total`.
- [x] Production build — evidence: `pnpm build` → exit 0, `Tasks: 2 successful, 2 total`.
- [x] `pnpm test` on this work — evidence: exit 0; Node suite 363 total / 362 passed / 0 failed / 1 documented skip; Vitest 44 files / 127 tests pass. `next-env.d.ts` build churn reverted, not committed.
- [ ] Owner-gated / still outstanding: (1) apply `20261107230000_tourism_sites.sql` to Production with preflight + backup (fixes the tourism failed state); (2) apply `20261121140000_media_administration.sql` to Production and set `CLOUDFLARE_API_TOKEN` (R2 object read/write on both buckets) plus `R2_ACCOUNT_ID`, `R2_BUCKET_PUBLIC`, `R2_BUCKET_PRIVATE` in Vercel — until then uploads honestly report "unconfigured"; (3) maintenance activation: set `MAINTENANCE_GATE_ENABLED=true` in Vercel (both deployments) and redeploy, then toggle end-to-end — currently also blocked by the Vercel "Git author Brave290 must have access to the project" issue; (4) legacy red gates on `main` not part of this branch: 9 failing browser-smoke tests traced to commit `6e1f362` (shared-header change + News flat-tab redesign vs old disclosure expectations + removed `.site-head` hiding CSS on dashboard/auth/member-reading) and the CodeQL "Code scanning is not enabled" configuration failure.

**Browser exposure rule (owner):** the media workspace keeps all R2 and Cloudflare credentials server-only (`import "server-only"`); no token, bucket name or object bytes reach the browser, action return value, RSC payload or console. Upload/delete results are honest status codes rendered as copy, never raw API responses.

## Chunk 12 — Newsroom R2 cover upload, live migration reconciliation and the Cloudflare/Vercel connection runbook (2026-11-21)

Continuation of Chunk 11 on branch `feat/phase1-platform-fixes-20261121`. Database work performed through the authenticated Supabase MCP connection with the owner's explicit authorisation ("fix errors in the migrations ledger and migrations ... make sure everything is applied against the live database nothing left out").

- [x] Enable direct cover image upload for news articles once R2 is configured — evidence: commit `8475d0f` (server-only `storeCoverUpload` in `frontend/apps/admin/lib/actions.ts`; `coverUploadState()` in `frontend/apps/admin/lib/media-r2.ts`; upload input + preview + exactly-one-source rule in `frontend/apps/admin/components/news-cover-url-fields.tsx`; availability passed from both newsroom pages; regression file `frontend/tests/admin-article-cover-upload.test.mjs`, focused suite 26/26 pass).
- [x] Apply every outstanding reconciliation migration to Production (`igqmybuiovaxqmrteebd`) — evidence: 14 atomic migrations applied through the authenticated Supabase MCP connection on 2026-11-21, listed in the "2026-11-21 UPDATE" section of `docs/reconciliation/2026-11-20-migration-reconciliation.md`; post-apply `to_regclass`/`to_regprocedure` gap query returns every restored object; trigger inventory includes `article_versions_guard`, the four forum triggers, `media_assets_set_updated_at`, `stream_config_set_updated_at` and `stream_status_checks_append_only`; ledger is 59 versions (latest `20261121074510`).
- [x] Fix the tourism "Destinations could not be loaded" state at its root — evidence: `20261107230000_tourism_sites` applied live (row #26 above); `tourism_destinations`, `tourism_submissions` and `tourism_submission_decide` resolve via `to_regclass`/`to_regprocedure`; page now renders its honest empty state instead of a 404 failure.
- [x] Correct the `admin_member_delete` audit-ordering defect flagged as DO-NOT-APPLY — evidence: `20261121161200_member_delete_audit_after_delete.sql` applied; the audit event is now written only after the `auth.users` delete succeeds.
- [x] Restore source reproducibility for `staff_profiles.must_change_password` — evidence: `20261121161300_staff_must_change_password_source_gap.sql` applied (idempotent `add column if not exists`, verified no-op on production).
- [x] Ship the Cloudflare R2 + Vercel connection runbook — evidence: `docs/handoffs/2026-11-21-cloudflare-r2-vercel-connection-runbook.md` (bucket creation, API-token scoping, exact Vercel environment table, GitHub Actions S3 credentials, verification checklist).
- [ ] Owner-performed (one-time, dashboard-only; no connector or credential exists in the agent workspace): create the public/private R2 buckets and API token per the runbook, set `R2_BUCKET_PUBLIC`, `R2_BUCKET_PRIVATE`, `R2_ACCOUNT_ID`, `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`, `CLOUDFLARE_API_TOKEN`, `MAINTENANCE_GATE_ENABLED=true` in Vercel (Production + Preview) and redeploy; create the S3 credentials for the GitHub backup workflow.
- [ ] Still open from the earlier "fix first" instruction: 9 red browser-smoke tests on `main` (commit `6e1f362` header/CSS regressions + News flat-tab spec drift) and the CodeQL "Code scanning is not enabled" repository-settings failure — both tracked separately from this branch.

**Browser exposure rule (owner):** unchanged from Chunk 11 — R2 credentials stay server-only; uploaded covers return only the public URL and metadata fields to the browser.
