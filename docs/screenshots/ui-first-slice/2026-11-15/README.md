# EPE LAWA first UI slice — visual and responsive evidence

These screenshots were captured from the production build in the isolated candidate worktree, not from a deployment. The responsive browser smoke passed at 320, 375, 600, 767, 768, 800, 960, 1024 and 1440 CSS pixels.

## What the smoke verified

At every width, the page had no horizontal overflow. From 320px through 767px, the fixed navigation displayed exactly four mounted destinations—Home (`/`), News (`/news`), Discover (`/tourism`) and Account (`/dashboard`)—with 56px-tall links. The News and Discover tabs exposed the correct current state. The homepage’s first “News from Epe” heading cleared the fixed bar by about 20–23px at 320, 375, 600 and 767px. At 768px and above, the bottom bar was hidden; the desktop navigation appeared at 1024px and 1440px.

The Community group in the mobile drawer exposed Forum. The smoke opened Forum from that drawer, then verified Escape closes the drawer and returns focus to its trigger. Keyboard focus visibility and minimum touch targets were checked. These checks cover this UI slice only; they are not a claim that every route or member/Admin journey is complete.

## Screenshots

- `home-320.png` and `home-375.png`: phone homepage, with the first story heading fully above the tab bar.
- `home-768.png`: tablet breakpoint, where the fixed tab bar is absent.
- `home-1440.png`: desktop homepage and shared navigation.
- `drawer-community-forum-375.png`: mobile drawer with Forum under Community and the four-tab bar.
- `news-375.png`: the News route’s unavailable state. The isolated preview did not have Supabase configuration, so it correctly showed “The newsroom did not load” rather than inventing or exposing stories. This is not evidence about production News availability.

## Verification recorded on the candidate worktree

With Node 22.23.5 and pnpm 10.34.9, the full workspace typecheck passed (5/5 packages), both production app builds passed (2/2), and the test suite passed with 286 passed, 0 failed and 1 skipped. The nine-width Chromium production-mode smoke passed. The final commit is to be rechecked before publishing the PR; hosted checks and independent Tester/reviewer verification remain required before any merge.

## Repository references

- Repository: [epelawa/EPE-LAWA](https://github.com/epelawa/EPE-LAWA)
- Candidate base: [`main` at `45aee2788f0c9b6a986dcb6181fa6d98434fdfc2](https://github.com/epelawa/EPE-LAWA/commit/45aee2788f0c9b6a986dcb6181fa6d98434fdfc2)
- Separate, merge-conflicted draft: [PR #101](https://github.com/epelawa/EPE-LAWA/pull/101). It is not this candidate and must not be merged as this UI slice.
