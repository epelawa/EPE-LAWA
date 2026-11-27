# Radio page changelog (turn 5)

## Public
- `app/radio/page.tsx`, `radio-page.module.css`: new editorial layout; removed the Naija catalogue link, the "No programme scheduled" pill, Request a song and Browse the archive.
- `lib/radio-store.ts` (new): a single shared audio element with a subscribe/snapshot store.
- `components/radio-player.tsx`: all player states, volume, mute, station switcher, live region, and a sound-wave that shows only while playing and respects reduced motion.
- `components/radio-mini-player.tsx` (new), mounted in `app/layout.tsx`.
- `components/radio-listen-button.tsx` (new): the hero Listen live / Pause radio button.
- `components/radio-schedule.tsx` (new): WAT day selector and guide.
- `components/radio-reminder.tsx`: confirm-before-permission flow.
- `components/sponsor-slot.tsx`, `sponsor-carousel.tsx`, `sponsor-logo.tsx` (new): the smaller `radio` variant with description and "Explore business" (single and carousel paths), and the logo fallback.
- `app/radio/programmes/on-air.ts`: fixed the `HH:MM` vs `HH:MM:SS` comparison.
- Deleted `app/radio/request-modal.tsx`, `request-actions.ts` and `archive/page.tsx`. `next.config.ts` adds a 301 from `/radio/archive` to `/radio`. `api/live/queues` no longer reports song requests.
- `lib/yo/part-8.ts`: Yorùbá entries for the new strings (draft, pending owner review).

## Admin (explicitly requested: remove song requests and the archive)
- `admin/app/(protected)/radio/page.tsx`, `actions.ts`: removed the episode archive and song-request queue UI and actions.
- `admin/lib/navigation.ts`, `capability-groups.ts`, `admin/app/(protected)/page.tsx`: removed the matching nav entries and dashboard tiles.
- No tables were dropped; `episodes` and `radio_song_requests` stay in the database untouched.
