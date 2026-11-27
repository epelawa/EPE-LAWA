# Radio page audit (turn 5)

Scope: public `/radio` plus the shared radio components. The admin radio desk was changed only to remove song requests and the episode archive.

## What existed before
| Area | Finding |
|---|---|
| Hero | A generic page intro with a "Station catalogue: Naija Radio ↗" link and the pill "No EPE LAWA programme is scheduled…". |
| Player | Inline `<audio>` per page. Playback stopped on navigation and there was no persistent player. |
| Song requests | A "Request a song on air" modal (`request-modal.tsx`, `request-actions.ts`), the admin queue and the `/api/live/queues` route. |
| Archive | `/radio/archive`, backed by `episodes`, had 0 rows in production. "Browse the archive" linked to an empty page. |
| Schedule | `on-air.ts` compared `HH:MM` with Postgres `HH:MM:SS` values, so a slot starting at the exact minute was missed (bug). |
| Ad slot | The sponsor card was full height on a dark page. With no logo it rendered a broken image box. |

## Production data (read-only queries, turn 5)
`programmes`, `radio_schedule`, `episodes` and `radio_song_requests` have **0 rows**, and `radio_status` is empty. So:
- the page must never claim "EPE LAWA live" or show a presenter or programme name;
- the schedule shows an honest "The schedule is being updated" state;
- the Thursday 13:30 WAT weekly push is a fallback reminder, **not** a programme, and is described as such.

## Stations (unchanged integrations)
- Radio Lagos 107.5 FM: `lib/radio-lagos.ts` (Elektran Broadcast Icecast stream).
- Guts FM 104.9: `lib/guts-radio.ts` (stream resolved server-side and proxied by `/api/radio/*`).
