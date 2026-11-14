# Radio Lagos 107.5 FM screenshots

These screenshots show the focused Radio player in the local production-mode app build, captured on 2026-11-14 before deployment. The 375×812 mobile view and 1440×900 desktop view both show the native player in its idle state; the player starts only after the visitor presses play.

The page used a loopback-only Supabase REST mock returning empty arrays for programme, schedule and archive queries. No production records or credentials were used. The MP3 stream was separately tested in Chromium; no audio body was saved or logged.

- `radio-375x812.png` — mobile viewport
- `radio-1440x900.png` — desktop viewport
