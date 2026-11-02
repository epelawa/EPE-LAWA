# EPE LAWA — Testing and Acceptance

**Document:** 11
**Status:** Active. This is a plan plus the honest current state. It is not a report of tests that
have not been run.

---

## 1. Current state — what has actually been verified

| Check | Command | Result | Date |
| --- | --- | --- | --- |
| Type check | `pnpm typecheck` | ✅ 6/6 tasks | 2 Nov 2026 |
| Production build | `pnpm build` | ✅ 3/3 apps | 2 Nov 2026 |
| Test suite | `pnpm test` | ✅ 28/28 | 2 Nov 2026 |

**What those tests do prove:** the auth access decision fails closed; the CSRF primitive rejects a
wrong token; the editorial state machine enforces independent approval; the built apps serve honest
metadata, security headers and a real 404; admin returns 503.

**What they do not prove:** that Supabase RLS works. The suite uses PGlite, an in-memory
Postgres-compatible engine with a simulated `auth.uid()`. It is a fast local check and it is labelled
as such. **It is not provider proof and must never be reported as such.**

**Not verified at all:** any provider integration (Resend, Paystack, GCS, Cloud Run, DNS), any real
browser behaviour, any real device, screen readers, radio playback, and every module from Phase 2 on.

---

## 2. Test levels

| Level | Tool | Covers | Gate |
| --- | --- | --- | --- |
| Type | `tsc --noEmit` | Every package | Every commit |
| Unit | `node:test` via `tsx` | Pure logic: state machines, validators, formatters, access decisions | Every commit |
| HTTP integration | `node:test` + spawned app | Real responses: status, headers, metadata, 404s, no-store | Every commit |
| Database | PGlite (fast) + real Supabase (proof) | RLS, constraints, triggers, transactions | Per migration |
| E2E | Playwright | The journeys in §3 | Per phase |
| Accessibility | axe + manual keyboard + screen reader | Contrast, names, order, focus | Per phase |
| Performance | Lighthouse, throttled profile | LCP, CLS, INP, bundle size | Per phase |

**Rule:** a mock test proves the mock. Any claim about authorisation, payments or storage requires a
test against the real provider, in an isolated environment, with the environment and date recorded.

---

## 3. End-to-end journeys — one per critical path

| ID | Journey | Phase | Must fail loudly if |
| --- | --- | --- | --- |
| E1 | Visitor lands, understands what the platform is, reaches every real section | 1 | A link 404s, or a section is described but not live |
| E2 | Reader opens news, reads an article, shares it | 2 | A draft is reachable, metadata is wrong, or the shared link breaks |
| E3 | Journalist drafts → editor approves → publisher publishes | 2 | Any one account can do all three |
| E4 | Reader submits a correction; staff actions it | 3 | A correction disappears, or the history is overwritten |
| E5 | Person profile publishes only with a recorded source | 3 | Publishing without a source succeeds |
| E6 | Listener plays live radio, loses connection, gets the archive | 4 | The UI claims live when it is not, or the spinner hangs forever |
| E7 | Member registers, verifies, comments, edits, deletes the comment | 5 | Member A can read member B's data |
| E8 | Member is reported, moderator hides with a reason, audit row appears | 5, 6 | The hide is unaudited, or the reason is optional |
| E9 | Banned member attempts to post | 6 | The insert succeeds at the database |
| E10 | Business submits, admin verifies, listing shows as verified | 7 | An unverified listing renders a badge |
| E11 | Member orders, pays, seller advances status | 8 | A tampered total is accepted, or a replayed webhook double-charges |
| E12 | Member deletes their account | 5 | Their comments vanish, or their email survives |

Playwright covers E1–E12 against a real database in a preview environment.

---

## 4. Security tests — negative first

These are the tests that matter. Positive tests prove the happy path; these prove the product.

1. Anonymous `select *` on every private table returns zero rows.
2. Member A reads member B's order by guessing the id → 404, not 403.
3. A member JWT against an admin route → 401/503, never content.
4. A staff JWT against a public write route → refused.
5. Draft article by direct slug → 404 on the news host, from search, from sitemap, from OG fetch.
6. Publish with a stale `expectedRevision` → 409, and the article is unchanged.
7. Journalist approves their own article → refused.
8. Banned member inserts into `forum_posts` → RLS refuses.
9. `insert into orders` with a client price using an authenticated token → privilege error.
10. Webhook with an invalid signature → 401, no state change.
11. The same webhook delivered twice → exactly one paid order.
12. `people` publish with no `people_sources` row → trigger raises.
13. Account deletion → auth user gone, email gone, comments intact and anonymised.
14. Service-role key absent from every built client bundle (grep the `.next/static` output).
15. A staff capability revoked mid-session → next protected action refused, not cached.

---

## 5. Accessibility acceptance

- Keyboard: every action reachable, in a logical order, with visible focus.
- Screen reader: one pass per phase on VoiceOver (iOS Safari) or TalkBack (Android Chrome) — the
  audience is mobile, so test mobile.
- Contrast: every final foreground/background pair measured, including hover, focus and disabled.
- Reflow: 320 px width and 400% zoom with no loss of content or function.
- Forms: labels, errors, and a summary that receives focus.
- Media: the radio player is operable by keyboard and announces state changes.
- Reduced motion respected.

Automated tools catch maybe a third of this. Manual testing is required, and the environment is
recorded.

---

## 6. Performance acceptance

Target: a mid-range Android on a throttled connection in Lagos, not a developer laptop.

| Metric | Target |
| --- | --- |
| LCP | < 2.5 s |
| CLS | < 0.1 |
| INP | < 200 ms |
| Initial JS (landing) | < 150 KB gzipped |
| Article page | < 200 KB gzipped excluding images |
| Image | AVIF/WebP, responsive `srcset`, lazy below the fold |

Measure with Lighthouse's mobile profile and a real device where available. Record the number, not an
impression.

---

## 7. Per-phase gate — the checklist that closes a phase

A phase is complete only when all of these are true and recorded:

- [ ] `typecheck`, `build`, `test` green, with the command output quoted
- [ ] Migration applied to an isolated environment and RLS negative tests passed
- [ ] The phase's end-to-end journey passes in Playwright
- [ ] Empty, loading, error and denied states exist and are distinguishable
- [ ] Responsive at 320 / 375 / 768 / 1024 / 1440, no overflow
- [ ] Keyboard pass and one screen-reader pass
- [ ] No console errors in production build
- [ ] Docs and tracker updated in the same commit
- [ ] Committed and pushed

---

## 8. Fixtures

- Tests use ephemeral, clearly synthetic data created inside the test and destroyed with it.
- **No seed scripts. No demo records loaded into any application database.**
- No production data in a preview environment, ever.
- Real-provider tests use dedicated test credentials and a test recipient address.

---

## 9. Known blind spots — state these in any status report

- The RLS simulation is not Supabase.
- No real browser test has run — headless Chromium could not start in the current sandbox.
- No real device has been tested.
- No provider has been configured, so no integration test has been possible.
- The radio stream has not been supplied, so playback is untested.
