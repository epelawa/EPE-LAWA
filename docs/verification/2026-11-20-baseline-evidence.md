# Baseline verification evidence — 2026-11-20

Read-only record compiled from `EPE-LAWA-MASTER-AUDIT.md` (audited commit `49bf9d80ef50afb119d6f2a415b72e864696eee0`) and inspected GitHub/Vercel state during the audit. This is a baseline, not acceptance evidence. `founda-scan` output is heuristic, not a type checker. No production writes were made at any point.

## 1. Verification baseline (audit commit `49bf9d8`)

| Check | Result | Source |
| --- | --- | --- |
| `pnpm test` | exit 1 — 321 tests, 308 pass, 13 fail; 43 vitest files skipped because the script is `tsx … && vitest run` and TAP failures short-circuit | §0 / §4.7 |
| `pnpm test:unit` | exit 1 — 2 files failed / 37 passed (39); 1 test failed / 105 passed (106) | §0 / §4.7 |
| `backend/tests/schema.test.mjs` | exit 1 — `20261119014000_private_enquiry_staff.sql` failed: `column p.must_change_password does not exist` | §4.7 #1 |
| CI step 9 on exact head | 321 tests / 311 pass / 10 fail — differs from QA 321/308/13; environment/worker sensitivity | §0 / §4.7 / §4.8 |
| Browser smoke | 9 failed / 56 passed | §0 / §4.8 |
| Last 20 GH runs | 16 fail / 4 cancelled / 0 success | §4.8 |
| `founda-scan` baseline | BLOCKED — health/readiness 76.7 (C), 20 CRITICAL / 166 WARNING / 2647 INFO | §1.5 |

Baseline run IDs: CI FAIL `44697062829`, smoke FAIL `44697062850` on push `49bf9d8`; PR #191 head `6839edc` both FAIL.

## 2. The 13 TAP failures — root cause

Schema drift / stale assertions / environment assumptions. Full classification in §4.7. Items #1, #9, #10-12, #13 were confirmed fixed by the merged remediation PR (see `docs/EXECUTION-CHECKLIST.md` Chunk 1.3). The audit gate wrapper `scripts/audit/run.mjs` was missing, so all four audit scripts (`audit`, `audit:security`, `audit:ui`, `audit:ci` at `package.json:20-23`) were dead and failed silently. The wrapper is restored and now fails loud.

## 3. Workflows

- `.github/workflows/ci.yml`: triggers PR + push to main, `contents:read`, concurrency cancels stale runs, pins pnpm 10.34.9 / Node 22, frozen install, `typecheck → build → test → audit --audit-level=high → whitespace`, CodeQL job `build-mode:none`, no secrets referenced. Actions pinned to mutable major tags (`@v7/@v6/@v4`) — HIGH hygiene issue, not yet fixed.
- `.github/workflows/browser-smoke.yml`: installs Chromium, runs 7 public specs, uploads SHA-labelled screenshots. `:68 if-no-files-found: ignore` means missing evidence does not fail the job — not yet fixed.
- Both workflows FAIL on their exact audited heads. Because CI fails at step 9 `Test`, the audit step never runs. `verify` failure examples: `public route manifest matches the Next page tree`, `cross-app raw imports participate in each app build cache key`. `public shell` failure examples: `dashboard-tabs.spec.ts:280`; five widths in `news-filter-navigation.spec.ts:6,:50,:74`; `public-routes-audit.spec.ts:55` radio heading `"Listen live."` not found.
- CodeQL passed in every CI run inspected. No branch protection on `main`.

## 4. Deployment evidence

- PR #183 `9fd5ba9` Vercel success `2026-11-18T11:50:01Z` / `11:50:43Z` on branch `arena/30600275-epe-lawa` — preview.
- PR #182 `ac512f9` / `ac512f5` Vercel success `11:40:48Z` / `11:41:35Z` — preview.
- main `49bf9d8` Vercel success `2026-11-20T07:45:40Z` plus Supabase Preview success while CI/smoke FAIL — proof that deployment is NOT gated by tests.
- `gh api repos/.../deployments?sha=…` returned empty arrays for PR heads (no GitHub Deployments promotion records). Vercel dashboard state beyond GitHub status contexts was not inspected — owner decision O13.
- Green preview deploy on a red-CI commit is not acceptance evidence.

## 5. PR #192 contexts (merge `05efaf5`, head `1f6f6aa`)

| Context | Result |
| --- | --- |
| `Vercel` | FAIL — "Git author Brave290 must have access to the project on Vercel to create deployments." (access/config blocker, owner decision O1) |
| `Browser smoke / public shell` | pending at audit time (deferred to project final gate by owner) |
| `CI / CodeQL security analysis` | pending at audit time |
| `CI / verify` | pending at audit time |
| `Vercel Preview Comments` | pass |
| `Supabase Preview` | skipping |

PR #192 was merged to `main` at `05efaf5` with those contexts deferred per explicit owner instruction. The final gate must re-verify all three pending contexts green on the final SHA. Agents must not bypass the Vercel access blocker or re-author commits to change the git author.

## 6. Post-remediation local gate (authoritative, head `1f6f6aa`)

| Check | Exit | Detail |
| --- | --- | --- |
| `pnpm typecheck` | 0 | 5/5 |
| `pnpm build` | 0 | — |
| `pnpm test:node` | 0 | 348 pass / 0 fail |
| `pnpm test:unit` | 0 | 44 files / 127 tests, stable across 3 consecutive runs after `isolate:true` |
| `founda-scan --json` | 1 (expected) | 20 CRITICAL / 166 WARNING / 2647 INFO, health/readiness 76.8 — unchanged from baseline, zero net new findings |

Browser smoke and GitHub CI contexts were not run locally (Playwright browsers not installed) and were deferred to the project final gate.
