# Route improvement plan: what is done, what is left

## Done in this branch
All P1 and P2 findings in `ROUTE_AUDIT_REPORT.md` are fixed and verified, plus P3-1 to P3-3. See `ROUTE_CHANGELOG.md` and `PLATFORM_UI_CHANGELOG.md`.

## Next, in priority order

### 1. Radio ad slot (blocked on owner asset)
- **Needs:** the approved provider logo (SVG or PNG, with usage rights) and the advertiser's destination URL.
- **Build:** a compact 56–64 px row under the player containing the logo (`alt` = provider name), the text "Sponsored", and a single link. One provider name, never repeated. Respect the existing sponsor disclosure copy, and use no animation.
- **Risk:** none, once the asset is approved.

### 2. Ìtàn Ilú Mi image uploads (needs a schema change, so owner approval first)
The current tables (`history_records`, `history_record_sources`, `history*` intake) have no media column. Production stores media on R2.

The proposed design was not implemented:
1. **Migration:** a `history_submission_media` table (`id`, `submission_id` FK, `object_key`, `mime`, `bytes`, `width`, `height`, `status` = `pending|approved|rejected`, `created_by`, `created_at`).
   - RLS: insert own row; select own pending row; staff select all.
   - There is no public read; public pages read only the `approved` rows that staff attach to a published record.
2. **Upload:** a server route that issues a short-lived presigned R2 PUT to a **private** prefix (`history-intake/<uuid>`).
   - Allowed types: `image/jpeg`, `image/png`, `image/webp`, up to 8 MB, checked both client-side and server-side via HEAD after upload.
   - No service keys in the browser.
3. **Client:** file input, preview (object URL), an XHR progress bar, retry on failure, and removal before submit. The submit is disabled while uploads are pending.
4. **Review:** an admin approves, which copies the object to the public media prefix. Nothing is public before review.

**Risk:** this touches DB schema, storage policy and admin tooling, which is exactly the category the brief says must be justified first.

### 3. Real-device and assistive-technology pass
- Automated checks ran in headless Chromium at 10 viewports. Still needed:
  - iOS Safari (safe areas, `100dvh` sheets, the push permission flow, which needs an installed PWA on iOS);
  - Android Chrome (real push delivery);
  - Firefox;
  - VoiceOver and TalkBack on the search dialog, the Notification Centre and the forum composer.
- Push delivery to a real device was **not** tested: there are no production subscribers, and no production pushes were sent.

### 4. Search resilience (optional)
- Consider partial results with a per-category "could not load" note instead of all-or-nothing, once there are enough collections that one failing bucket is likely. The current behaviour is deliberate (it never shows a false "no results").

### 5. Small polish
- `/dashboard`: give the loading shell a visually hidden h1 ("Your dashboard"). This is a member-area change and needs a smoke re-run.
- Forum thread: when the empty notices region and the poll are absent, the remaining gap is the standard 24 px stack gap. Fine as is, but could tighten to 16 px on phones.
- Data-backed visual checks for Who is Who, business detail and tourism detail need fixture records. The repo smoke stub has none for those tables, so those detail pages were verified through code and through their error and empty states.
