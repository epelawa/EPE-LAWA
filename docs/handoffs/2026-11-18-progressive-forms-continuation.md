# Progressive forms continuation

The owner requested step/progress-based forms throughout the platform. This change is **partial**, not a platform-wide conversion:

- New newsroom article creation has three steps, percentage progress, per-step browser validation, back navigation and retained in-page values. Existing guarded create/publish actions and cover rights fields remain unchanged.
- Business submission has two steps with percentage progress and the existing server-side member authorization and validation.
- Existing sign-up/auth steps were already progressive. Article editing now also has three validated steps, retaining its revision and private save/correction actions. Other member, public and Admin forms have not been converted or comprehensively audited.
- These changes do not implement private autosave or refresh recovery, image upload, or server-confirmed recovery feedback. A refresh or a server redirect after an error may still lose unsaved values. Do not describe this work as completing the full newsroom authoring backlog.
- Component tests use mocked server actions and jsdom; actual browser/mobile interactions, authenticated writes, error recovery and production deployment remain unverified. No production content or submissions were created.

Continue by inventorying complex forms, grouping logical steps while preserving server-side checks, testing keyboard/validation and error recovery, and designing private recovery with appropriate access and retention controls. Keep short, single-purpose forms usable rather than adding artificial steps.

## Newsroom save feedback follow-up

Creation and private editing now use enhanced server-confirmed feedback: entered fields remain in the open form on a returned error, and ambiguous save outcomes warn staff to check the newsroom/article revision before explicitly allowing a retry. Existing guarded RPCs, explicit publication and revision checks are unchanged. Non-JavaScript forms retain server-action fallback, but navigation can still lose unsaved input. This is not autosave or refresh recovery. The review/edit form also disables its submit button while saving. Component tests use mocks; real authenticated browser writes, network failures and duplicate prevention have not been verified. Direct media upload, server-side private recovery, safe public edits, deletion, scheduling, social settings and staff password-change work remain outstanding; no migration or production content was changed.

## Optional same-tab recovery

New and edit forms now offer explicitly enabled browser-session recovery. The copy is kept in sessionStorage on the same tab, scoped by verified account ID and article, never published or saved to the server, and warns about shared devices. Restore is explicit; a changed revision is flagged, missing selector options require reselection, and a confirmed enhanced save removes the copy. A 24-hour age limit is checked when the editor next opens, not a guaranteed background deletion; browser session storage can remain accessible to someone with the same browser session. No-JavaScript submissions cannot clear a browser copy. This is not encrypted or cross-device/server recovery, and it is not a substitute for a private server-side autosave and retention policy. jsdom tests cover controlled fields, refresh, revision warning, opt-in and expiry; real browsers, mobile, and authenticated production flows remain unverified.

## Cover-validation follow-up

The create/edit cover fields now surface conflicting approved and linked covers and unsafe linked-cover/source/license URLs through native form validation before submission; server validation remains authoritative. Existing input and credit metadata are not silently cleared. The new-article preview shows a branded placeholder if no cover is selected or the preview fails. This does not verify remote image ownership, rights, content type, availability to social crawlers, or implement direct uploads; linked images are still requested by the browser. Component tests cover the conflict, HTTPS checks, preservation and missing-cover preview. Real browser and authorized production editing remain unverified.
