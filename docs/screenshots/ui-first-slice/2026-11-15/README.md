# EPE LAWA first UI slice — visual and responsive evidence

These screenshots were captured from a local production build of app-code commit [`b447a5afa4e685e23a4503f802c66bd6795e5261`](https://github.com/epelawa/EPE-LAWA/commit/b447a5afa4e685e23a4503f802c66bd6795e5261) in the isolated candidate worktree—not from a deployed environment. The screenshots and this README are evidence-only updates after that application commit; no app source changed afterward.

## What the browser smoke verified

The production-mode Chromium smoke passed at 320, 375, 600, 767, 768, 800, 960, 1024 and 1440 CSS pixels. There was no horizontal overflow at any width. At 320px the hero copy kept 16px left/right gutters; at 375px it kept 20px gutters. The first “News from Epe” heading cleared the fixed bar by about 20–23px on mobile.

From 320px through 767px, the single named mobile navigation landmark exposed exactly four mounted destinations—Home (`/`), News (`/news`), Discover (`/tourism`) and Account (`/dashboard`)—with 56px-tall links. News and Discover showed the correct current state. Starting on `/tourism`, keyboard focus and Enter on the actual News tab navigated to `/news` and set `aria-current="page"`. The mobile drawer exposed Forum under Community; Escape closed it and restored focus to the trigger. At 768px and above the bottom bar was hidden; desktop navigation was visible at 1024px and 1440px.

These checks cover this UI slice only. They are not a claim that every public route or member/Admin journey is complete.

## Screenshots

- `home-320.png` and `home-375.png`: phone homepage after the gutter correction; first-story heading remains above the tab bar.
- `home-768.png`: tablet breakpoint, where the fixed tab bar is absent.
- `home-1440.png`: desktop homepage and shared navigation.
- `drawer-community-forum-375.png`: mobile drawer with Forum under Community and the four-tab bar.
- `news-375.png`: the News route’s unavailable state. The isolated preview did not have Supabase configuration, so it correctly showed “The newsroom did not load” rather than inventing or exposing stories. This is not evidence about production News availability.

## Verification and review status

On application commit `b447a5afa4e685e23a4503f802c66bd6795e5261`, Node 22.23.5 / pnpm 10.34.9 passed the full workspace typecheck (5/5 packages), both production app builds (2/2), and the full suite (287 passed, 0 failed, 1 skipped). The nine-width browser smoke described above passed, including direct keyboard activation of News and the 320/375px gutter checks. A separate evidence-only commit adds this README and the refreshed PNG captures.

The PR #108 harness is still a draft and has not been edited here. Tester is correcting three locator issues and will rerun the corrected harness against the final PR #109 head; Backend Developer 1’s independent review of that same head is also pending. This local smoke is not a substitute for either review. Keep PR #109 unmerged until those checks complete.

## Repository references

- Repository: [epelawa/EPE-LAWA](https://github.com/epelawa/EPE-LAWA)
- Draft UI review: [PR #109](https://github.com/epelawa/EPE-LAWA/pull/109)
- Candidate base: [`main` at `45aee2788f0c9b6a986dcb6181fa6d98434fdfc2](https://github.com/epelawa/EPE-LAWA/commit/45aee2788f0c9b6a986dcb6181fa6d98434fdfc2)
- Separate merge-conflicted draft: [PR #101](https://github.com/epelawa/EPE-LAWA/pull/101). It is not this candidate and must not be merged as this UI slice.
