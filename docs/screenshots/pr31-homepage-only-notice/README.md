# PR #31 — Homepage-only storage notice

Captured on 2026-11-10 from the local production build. The app ran at `127.0.0.1:3015`; its only data endpoint was a loopback HTTP stub at `127.0.0.1:54324`, which returned empty reads and unauthenticated responses. The build used the canonical site URL and `ALLOW_INDEXING=true`, with dummy Supabase credentials. No production data or service was contacted.

## Evidence

- [320×568 homepage — notice visible and floating](local-320x568-home-storage-notice.png)
- [375×812 homepage — notice visible and floating](local-375x812-home-storage-notice.png)
- [1440×900 homepage — notice visible and floating](local-1440x900-home-storage-notice.png)
- [320×568 News — notice absent](local-320x568-news-no-storage-notice.png)
- [375×812 News — notice absent](local-375x812-news-no-storage-notice.png)
- [375×812 Contact — notice absent](local-375x812-contact-no-storage-notice.png)

The capture checks confirmed that the notice is visible on `/`, `position: fixed`, and 12px above the viewport bottom. It is absent on `/news` and `/contact`. There was no horizontal overflow at 320px or 375px; the 1440px capture also fit within its viewport.

These are local visual checks, not hosted-preview evidence. The exact PR deployment is checked separately after the synced branch is pushed.
