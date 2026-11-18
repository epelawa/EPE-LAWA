# EPE LAWA — 18 November continuation handoff

**Snapshot:** 18 November 2026, 06:08 WAT (UTC+01:00)

**Current `main`:** [`43eae784de7880d993be21673219c265d031adcf`](https://github.com/epelawa/EPE-LAWA/commit/43eae784de7880d993be21673219c265d031adcf)

**Merged change:** [PR #154 — Unify public footer, newsletter and responsive shell](https://github.com/epelawa/EPE-LAWA/pull/154)
**Documentation PR:** [#155](https://github.com/epelawa/EPE-LAWA/pull/155), open for review; this handoff and the checklist updates are included in its review scope.

## Completed and verified — strike-through means done for this scope

- [x] ~~Shared newsletter/footer panel on the homepage, News listing, article-slug pages, and radio reminder page; removed duplicate News-local footers.~~
- [x] ~~Branded SVG “page not found” empty state.~~
- [x] ~~EPE LAWA logo fallback for missing/broken homepage story-card images. This does not yet prove uploaded article cover images appear in social shares.~~
- [x] ~~Fixed narrow-screen News filter overflow and stopped the shared footer from covering protected dashboard routes.~~
- [x] ~~Exact-head browser smoke for PR #154 passed.~~ [Run #44240056909](https://github.com/epelawa/EPE-LAWA/actions/runs/44240056909)
- [x] ~~Affected local regression tests passed 34/34; `git diff --check` passed.~~
- [x] ~~CI test stage, typecheck, build, and CodeQL completed without reported failures.~~ CI as a whole is **not** green; see the remaining security blocker below.

PR #154 was merged to `main` at `43eae784de7880d993be21673219c265d031adcf`. GitHub reports the merge actor as account `epelawa` at `2026-11-18T04:57:06Z`; the assistant did not issue a merge command. No Production deployment/live-domain acceptance was verified, and PR #154 made no Supabase schema, migration, user-content, or production-setting changes.

### CI/security blocker — still open

[CI run #44240056915](https://github.com/epelawa/EPE-LAWA/actions/runs/44240056915) failed only at `pnpm audit --audit-level=high`. The audit found one high-severity picomatch ReDoS advisory, [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), reachable through `.>vitest>picomatch` and `admin>tailwindcss>chokidar>anymatch>picomatch`. Do not mark this complete, suppress the advisory, or describe CI as all-green. Resolve only through a verified safe patched dependency path and rerun exact-head gates.

## Not done — owner-requested continuation queue

### News navigation, discovery, and presentation

- [ ] Fix and verify navigation/scroll behavior so opening `/news` from the homepage and selecting News links or controls starts at the top of the destination page, not near the footer. Test direct entry, client navigation, browser back/forward, and scroll restoration.
- [ ] Redesign the category control as a polished accessible custom dropdown. Verify it closes after selection, preserves the selected filter, supports keyboard/touch, and does not overflow. The current browser smoke verifies viewport overflow only; it does not sign off this visual/interaction request.
- [ ] Upgrade `/news` with clearly differentiated breaking/latest stories and a useful way to discover recent published items. Any “breaking” or “latest” designation must come from an authorized, persisted article state and only show currently published stories.
- [ ] Remove or redesign the user-reported obsolete “free”/promotional News block after identifying the exact component; do not remove unrelated content by guesswork.
- [ ] Improve the News empty state, search/category controls, centered labels, button sizing, spacing and overall professional look. Audit hover/focus/active colors so text and icons do not disappear against white.
- [ ] Verify full article byline placement, including the requested author credit at the article end. Use the approved stored author identity/name, not invented copy.
- [ ] Redesign the article-detail page with useful additional context and navigation (for example, related published stories, verified reading time, and share actions) while preserving sourced facts and a readable mobile layout.
- [ ] Verify article sharing on Facebook, YouTube, WhatsApp, and other supported services: the published cover should appear through correct Open Graph/Twitter metadata and a canonical image URL. The homepage fallback is not proof of share-preview behavior.
- [ ] Deliver the requested ten additional article presentation styles only after agreeing their names, accessibility rules, and content compatibility; avoid cosmetic variants that obscure editorial hierarchy.
- [ ] Add restrained stretch/press/motion effects to buttons and selective glassmorphism where it improves legibility. Keep reduced-motion behavior, high contrast, focus visibility, and non-hover operation. Do not add effects indiscriminately.

### Admin newsroom authoring, media, and publication

- [ ] Replace the current article-upload UI with a progressive, responsive workflow. Initial view should show only the first step; later steps open with visible percent progress, field validation, save/upload states, and useful recovery feedback. Include private autosave/recovery feedback without publishing unsaved content. Use branded edit/upload modals rather than native browser dialogs; verify edit, save, cancel, delete, and reuse flows.
- [ ] Keep edit/upload modals accessible and fixed in the page flow—not user-draggable. Verify focus trapping/restoration, Escape, backdrop, validation, and mobile sizing.
- [ ] Requested fields/flow: title; plain-text article content (not raw HTML); existing category/tag selector plus any approved custom-category flow; author selector; cover URL or upload; reading-time estimate with an automatic/manual control; and a clearly authorized breaking/latest toggle. Test what is stored, previewed, published, and shareable for each field.
- [ ] Use the configured Supabase storage bucket only after verifying bucket authorization, ownership, file-type/size validation, image processing, failure cleanup, and public-read policy. Add upload/progress and recovery feedback. The requested 20 KB → 5–10 KB compression target must be tested against image dimensions and a quality floor; do not promise that every image can meet an arbitrary byte target without unacceptable quality loss.
- [ ] If an uploaded article has no cover, use the approved site logo automatically and consistently in the Admin preview, first public render, article page, and share metadata. The verified homepage-card fallback does not complete this requirement.
- [ ] Add safe social-video URL provider detection and SVG icons for an explicitly supported allowlist (e.g. Facebook and YouTube). Do not trust embedded HTML or fetch arbitrary URLs server-side. Arbitrary-image extraction from public pages requires SSRF-safe URL/redirect/IP controls and content-type/size limits.
- [ ] The notes ask to remove Search title, Search description, Approved cover/No cover, cover alt text, image credit, source URL, license URL, and credit caption, while also asking to upload/reuse covers and show them on social shares. Reconcile this before deleting fields: SEO, accessible alternatives, image rights/provenance, and share metadata must remain valid. If the UI fields are removed, define which metadata is automatically retained and where staff can review it.
- [ ] The notes conflict on drafts: one request says remove the draft system; another asks for autosave/recovery after refresh and progress saved to draft. Decide whether to remove the visible draft-publishing workflow while retaining private recovery snapshots, or keep drafts. Unsaved/recovery content must never become public automatically.
- [ ] Define the requested public-edit behavior: owner asks for edits to save under the existing slug and appear publicly without a separate “Publish now” button. Preserve `article.publish` capability checks, stale-revision rejection, correct public-version updates, and durable audit history. Never make private drafts public accidentally.
- [ ] Define safe article deletion, secondary-image deletion, and “reuse article” behavior. Permanent deletion needs explicit scope across versions, files, caches, backups, analytics, and legal retention; preserve required audit evidence and require confirmation/authorization.
- [ ] Support scheduled/automatic publication only after timezone, authorization, pause/cancel, retry/failure, and audit behavior are defined and tested.
- [ ] Replace the long raw `ActionOutcomeRecorded` event dump with concise top-of-screen toasts for publish/save/unpublish/error feedback. Remove the noisy UI presentation only; preserve durable audit records. Success toasts must follow server-confirmed success and be screen-reader accessible.
- [ ] Add an Admin settings area for supported social links and account settings. Password change must use the authenticated staff identity and supported reauthentication/auth-provider flow; never store or email raw passwords.
- [ ] Apply progressive forms to other complex Admin workflows where useful; audit button/menu latency and remove unnecessary waits. “Respond in milliseconds” is a performance target to measure, not a guarantee to claim without benchmarks.

### Login, signup, forms, and end-to-end validation

- [ ] Audit every public, member, and Admin form for layout, labels, validation, pending/success/error states, keyboard/focus, mobile keyboard behavior, persistence, and server-confirmed outcomes; redesign the forms the owner rejected rather than only patching their colors.
- [ ] Add secure username-availability validation using a server-side, rate-limited database check that avoids account enumeration and race conditions; enforce uniqueness at the database layer as well as in the UI.
- [ ] Decide authentication architecture before replacing OTP. Supabase Auth currently owns identity/session boundaries; a custom OTP flow needs abuse controls, expiry, one-time use, replay protection, rate limits, recovery, audit and compatible session issuance. Choose whether Supabase SMTP or a separately configured Vercel/custom mail route sends the branded template; never invent a parallel identity system or claim delivery without isolated end-to-end verification.
- [ ] Complete live end-to-end verification of sign-in/signup/verification, publishing, comments, saved stories, and notification delivery, using isolated/synthetic accounts and approved test data.

### Wider pages, operations, privacy, and integrations

- [ ] Audit all buttons, links, menus, filters, and other pressable controls across the site for destination, action, pending behavior, errors, focus, touch targets, responsive layout, and broken/no-op behavior. Do not mark the full-site audit done from the News smoke test.
- [ ] Audit the wider page set, including Admin, member, and Itàn Ilú Mi/history workflows; test role-based authorization and loading/empty/denied/error/success states. The user’s current direction is to leave the homepage as it is, upgrade News, and redesign the other public pages rather than redesigning the homepage again.
- [ ] Complete full accessibility, responsive, role-based, and Production integration testing on the exact reviewed release candidate. A browser run against one PR does not certify all routes or Production.
- [ ] Verify live sign-in, publishing, comments, saved stories, notifications and email delivery. Do not claim provider operation from local mocks or route responses.
- [ ] Newsletter form route/footer exists, but fuller professional copy/layout and real delivery, unsubscribe, consent, and monitoring are not all verified. Contact and advertising intake remain open until persistent monitored routes are tested.
- [ ] Payments and private history-media workflows remain unverified and scope-sensitive. Do not collect payments or accept private media until persistence, privacy, authorization, moderation, retention, and provider flows are approved and tested.
- [ ] The existing view counter is not live visitor or country analytics. Design real analytics only after purpose, data source/accuracy, consent, access, disclosure, retention, and country-data handling are approved. Never present article views as concurrent visitors or geography.
- [ ] Secure permanent deletion remains a design and data-safety decision, not an implemented feature. Define the records/files/backups it covers, capability checks, confirmation, recovery window, audit/tombstone behavior, retention, and verified backup consequences before purging data.

## Other areas not yet touched or not fully accepted

The checklist above covers newly restated owner requests, not proof that every existing product module is complete. Still require a route-by-route implementation and acceptance pass for: public About/Contact/Privacy/Terms/Guidelines/gallery; Itàn Ilú Mi/history and private media; forum and moderation; map/navigation; business directory and orders; tourism; radio schedules/archives/reminders; Who Is Who; member auth/dashboard/profile/saved; all Admin pages/settings/roles; and newsletter/contact/advertising providers. Reconcile database migrations/RLS with the live project read-only before any new Production schema or data operation. Confirm domain/deployment SHA and privacy/legal/provider readiness separately.

## Ten optional feature ideas for later owner review

These are suggestions only—not approved scope and not represented as implemented.

1. Epe community events calendar with verified organizers and calendar export.
2. Curated tourism day-trip planner with licensed photos, accessibility notes, and source dates.
3. Searchable, consent-based oral-history archive with audio transcripts and provenance.
4. Verified local-business directory with claimed profiles and moderated updates.
5. Topic and locality subscriptions for News/Radio, with frequency controls and opt-out.
6. Low-bandwidth mode with compressed thumbnails and explicit offline-safe reading lists.
7. Bilingual English/Yoruba story summaries reviewed by editors.
8. Community photo/story submissions with consent, attribution, moderation, and takedown workflow.
9. Accessible local-service directory for public amenities, with source/last-checked dates.
10. Saved custom News briefings and shareable collections built only from published stories.

## Next sequence

1. Fix the News-to-top navigation behavior and complete the compact News filter/search UX, then test route navigation and category close behavior.
2. Audit and correct article cover/Open Graph sharing and article-end bylines.
3. Agree on the authoring-form, metadata/credit, draft/autosave, cover extraction, and public-edit decisions before altering data or publication semantics.
4. Implement progressive Admin authoring, upload/recovery feedback, settings, and accessible toasts while preserving capabilities and audit history.
5. Reconcile authentication, analytics, permanent deletion, contact/advertising, payment, and private-history requirements with privacy, schema, and provider constraints.
6. Resolve picomatch with a verified patched dependency path, then run full tests, typechecks, production builds, accessibility and responsive tests, browser smoke, and the high-severity security audit on the exact candidate.
7. Record which items are completed by exact evidence; strike through only verified completed tasks, then refresh the canonical checklist and progress log.

## Evidence limits

The merge and hosted checks are repository evidence only. This handoff does not verify a Production deployment, production analytics, real email delivery, scheduled jobs, secure purge behavior, article-share images, custom-OTP delivery, or new Admin settings. The broader UI/release acceptance list remains in [`docs/18-project-status-implementation-checklist.md`](../18-project-status-implementation-checklist.md); old tracker entries are dated history, not current status.
