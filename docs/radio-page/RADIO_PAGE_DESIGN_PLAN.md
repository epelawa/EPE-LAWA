# Radio page design plan (turn 5)

**Direction:** premium editorial. Dark Midnight/Navy band for the listening area and warm neutral surfaces below. Cobalt `#477FE0` is the only accent; amber `#F0B14A` is reserved for the Live indicator. No gradients, glass or neon. Motion is limited to the optional sound-wave, which is disabled under `prefers-reduced-motion`.

**Order:** intro → player → station selector → sponsored business → programme guide → on-air notifications → keep exploring.

| Block | Decision |
|---|---|
| Hero | "EPE LAWA RADIO" / "The sound of Epe." / "Stay connected to the people, stories and conversations shaping our community." Actions: **Listen live** (toggles the shared player) and **Explore programmes** (`/radio/programmes`). |
| Player | One shared `HTMLAudioElement` in `lib/radio-store.ts` (`preload="none"`, created on first Play). States: idle, loading, playing, paused, error and retry. Mute plus a volume slider with `aria-valuetext`. Status text sits in `role="status" aria-live="polite"`. No autoplay. |
| Stations | Two buttons with `aria-pressed`. Switching swaps the `src` on the same element, so only one stream ever plays. |
| Mini-player | Rendered in `layout.tsx` once playback has started on any page. Navigation keeps the same audio element, so the stream does not restart. Its station/status area is a link back to `/radio` (accessible name "Return to the radio page. …"), and "Hide mini-player" hides the bar without stopping audio. Positioning respects `env(safe-area-inset-*)`, the storage notice height and the mobile nav clearance. It sits at z-index 56, below dialogs, the drawer and the push prompt. |
| Sponsor | `SponsorSlot radio`: smaller card with "Sponsored", logo, name, category, description and "Explore business". Content comes from the admin Ads desk (`business_ad_carousel`); nothing is hardcoded. A missing logo falls back to the EPE LAWA mark, and no sponsor falls back to "Advertise here". |
| Schedule | WAT day selector (`role="group"` "Choose a day", `aria-pressed`), "On air now (per schedule)" marker, `.ics` export, and honest empty and error states. |
| Reminders | Existing Web Push `radio` topic. Permission is asked only after an explicit "Confirm radio notifications" click. |
| Removed | "Request a song on air" and "Browse the archive" (public and admin); `/radio/archive` now 301-redirects to `/radio`. |
