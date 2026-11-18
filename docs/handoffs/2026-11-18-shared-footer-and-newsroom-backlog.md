# EPE LAWA — 18 November continuation handoff

**Snapshot:** 18 November 2026, 06:01 WAT (UTC+01:00)
**Current `main`:** [`43eae784de7880d993be21673219c265d031adcf`](https://github.com/epelawa/EPE-LAWA/commit/43eae784de7880d993be21673219c265d031adcf)
**Merged change:** [PR #154](https://github.com/epelawa/EPE-LAWA/pull/154) — shared public footer, newsletter, and responsive-shell fixes.

## Verified completion in PR #154

PR #154 added the shared public/newsroom footer and active newsletter form to the homepage, News listing, article-slug pages, and radio reminder route; removed the News page-local duplicates; added a branded SVG 404 state; restored the EPE LAWA logo as the homepage story-card missing/broken-image fallback; and corrected mobile News filter overflow and footer visibility in protected dashboard routes. It also updated route and regression tests.

GitHub reports the PR was merged by account `epelawa` at `2026-11-18T04:57:06Z`, with merge commit `43eae784de7880d993be21673219c265d031adcf`. The assistant did not issue a merge command. No Production deployment or live public-domain behavior was verified by this work.

### Exact-head verification

- [Browser smoke run #44240056909](https://github.com/epelawa/EPE-LAWA/actions/runs/44240056909): **passed** on `8da2a0313aa63c83e2fce78f028d7b64ae0c5664`.
- [CI run #44240056915](https://github.com/epelawa/EPE-LAWA/actions/runs/44240056915): test stage reported **0 failures**; typecheck and build completed successfully; CodeQL analysis passed. The verify job is **not green** because its dependency-security-audit step failed.
- [Local focused regression tests](https://github.com/epelawa/EPE-LAWA/commit/8da2a0313aa63c83e2fce78f028d7b64ae0c5664): **34 passed, 0 failed**; `git diff --check` passed.
- The CI audit reports one **high-severity picomatch ReDoS advisory**, [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), reachable through `.>vitest>picomatch` and `admin>tailwindcss>chokidar>anymatch>picomatch`. Keep this blocker visible. Do not waive the audit, suppress the advisory, or claim an all-green CI run. Resolve it only after confirming a safe patched dependency path and rerun the exact gates.

The PR changed application UI and tests; it did not make Supabase schema, migration, user-content, or production-setting changes.

## Open owner-requested work

The following is a continuation queue, not a claim that these features already work.

### Public analytics and privacy

- The existing view counter is **not** live visitor or country analytics. Do not present article views as real-time active visitors or geographic counts.
- Design an accurate analytics path, identify collection sources and failure states, and settle purpose, consent, retention, access, disclosure, and country-data rules before collecting additional personal or location data. Keep unavailable metrics explicitly unavailable; do not invent values.

### Newsletter and News-page UX

- Review the now-shared newsletter panel’s copy and layout for the requested more professional, fuller explanation; keep it identical across public pages and make subscription, unsubscribe, consent, pending, and error states truthful.
- Revisit the News filter/search visual design: compact, centered, accessible controls; close category/search lists after selection; verify route changes begin at the top rather than leaving the user scrolled near the footer; and test at 320px/375px. Remove any obsolete “free” label or promotional block if present. Browser smoke currently verifies overflow, not every interaction or visual acceptance criterion.
- Verify that author attribution appears on News cards and at the end of each full article, with the author supplied by the approved article record rather than invented copy.

### Newsroom authoring and publication

- Rebuild the article editor as a progressive multi-step flow: initially show only the first-step fields; reveal later steps with clear progress, validation, save state, and restrained transitions. Add modal editing/upload where requested, draft recovery, and reliable progress feedback.
- The owner asked to remove the Search title/description and Approved cover/No cover fields and prefilled covers from the editor. Reconcile this with existing SEO metadata, image-credit/licensing requirements, and the separate request for safe image extraction from arbitrary page links before removing data or capabilities.
- Use the configured Supabase storage bucket for approved uploads only after verifying bucket scope, file-type/size checks, access controls, image processing, and failure cleanup. The owner requested aggressive compression (even a 20 KB image down to 5–10 KB); validate visual quality and dimensions and set a tested target/quality floor rather than promising an impossible output size for every image.
- Add a URL input that identifies supported social-video providers (for example Facebook and YouTube) and shows safe provider SVG icons. Use a fixed provider allowlist and safe URL parsing; never server-fetch arbitrary URLs or trust page-provided markup. Confirm exact supported platforms and fallback behavior.
- The owner asked for edits to save and reflect on the public slug without a separate “Publish now” button. Before changing publication semantics, define how edits to already-published articles behave and preserve `article.publish` authorization, stale-revision checks, accurate public versioning, and an audit record. Do not make draft edits public accidentally.
- Support automatic/scheduled publication only after defining timezone, authorization, cancellation, retry/failure handling, and auditable job behavior. Do not imply that a schedule exists until it is operationally verified.

### Admin settings and feedback

- Add an Admin settings area for supported social links and account settings. A password change must use the authenticated staff identity and the auth provider’s supported reauthentication/update flow; do not store or email raw passwords.
- Replace the long raw `ActionOutcomeRecorded` event dump with compact, top-of-screen transient toasts for user-facing outcomes. Preserve durable authorization/audit records; remove or redesign only the noisy presentation, not the underlying audit trail.
- Keep toast success server-confirmed; pending and failure states need clear feedback, and announcements should be accessible.
- Apply progressive disclosure to other complex Admin forms where it improves completion, without hiding required validation or permission context. Measure button/menu response times and remove avoidable delays; do not claim a fixed millisecond service level until it is benchmarked.

### Deletion and secure operations

- Design secure permanent deletion separately from ordinary editing: decide what “permanent” means across primary rows, versions, media, caches, backups, exports, analytics, and legal retention; specify capability checks, confirmation, recovery window (if any), audit/tombstone behavior, and verified backup implications. Do not implement destructive deletion or purge existing records before those rules and the production data/schema baseline are approved.

## Recommended order for continuation

1. Resolve the picomatch audit using a verified patched dependency path; rerun CI and CodeQL on a new exact head without suppressions.
2. Record the product decisions that affect data/publication: analytics scope/privacy, editor metadata/cover-field intent, public-edit behavior, automatic-publication rules, deletion semantics, provider allowlist, and Admin settings permissions.
3. Implement the low-risk Admin presentation work (progressive editor UI, toasts, condensed action-history presentation) while preserving existing server authorization and audit storage.
4. Add safe provider-link parsing/configuration and authenticated password-update flow; test authorized and denied paths.
5. Implement analytics and any deletion/scheduled-publication backend only after the relevant data, privacy, schema, and operational decisions are resolved.
6. Run full repository tests, typechecks, production builds, accessibility/responsive browser smoke, and security audit on the exact PR head. Update this handoff and the canonical checklist with exact run links and final outcomes.

## Evidence limits

The merge and hosted checks are repository evidence only. This handoff does not verify a Production deployment, production analytics, real email delivery, scheduled jobs, secure purge behavior, or new Admin settings. The broader UI/release acceptance list remains in [`docs/18-project-status-implementation-checklist.md`](../18-project-status-implementation-checklist.md); older tracker entries should be read as dated history, not current status.
