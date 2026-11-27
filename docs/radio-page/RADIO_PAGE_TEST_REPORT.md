# Radio page test report (turn 5)

All results below were run in this sandbox against a production `next build` served with `next start` and the local Supabase fixture (`frontend/tests/browser-smoke/supabase-stub.mjs`).

| Check | Result |
|---|---|
| `radio-page.spec.ts` (8 Playwright tests) | **8/8 pass** |
| `public-routes-audit.spec.ts` (includes `/radio`, `/radio/programmes`, `/radio/reminders`) | pass |
| Vitest `radio-store`, `sponsor-logo` | pass (part of 175/175) |
| node tests `radio`, `radio-player`, `features-batch1`, `sponsor-carousel` | pass |
| Responsive audit, 22 viewports × radio routes | 0 overflow, overlap or small-target findings |

## What the browser tests prove
- Before Play: no request to the stream host, the player says "Press Play to listen…", and the removed features are absent.
- Play: exactly one stream request. Playback continues into the mini-player on another page, and hiding the mini-player does not pause audio.
- An unreachable stream shows an honest error and a working retry.
- The guide shows fixture slots in WAT, the day selector toggles `aria-pressed`, and the on-air marker appears.
- Reminders: no permission prompt on load; the prompt appears only after the confirm click.
- No horizontal overflow across the full owner matrix.

## Not verified
- **The real live streams were not played.** Tests intercept `azstream.elektranbroadcast.com` and the Guts FM proxy. Audio playback on production should be checked by a person after deploy.
- No manual screen-reader pass (VoiceOver, TalkBack or NVDA) was done. No WCAG conformance claim is made from automated checks.
