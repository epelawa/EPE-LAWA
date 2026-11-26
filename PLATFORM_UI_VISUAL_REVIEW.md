# Platform UI visual review

Screenshots: `docs/route-audit/interactions/screens/` (375×812 and 1440×900), produced by `docs/route-audit/interactions.mjs` against the production build. Headless Chromium; no real devices.

| State | 375 (mobile sheet) | 1440 (desktop) | Notes |
|---|---|---|---|
| Search: idle | `search-idle-375.png` | `search-idle-1440.png` | Title "Search EPE LAWA", the subtitle and placeholder exactly as briefed. Full-height sheet on mobile; 680 px panel on desktop |
| Search: results | `search-results-375.png` | `search-results-1440.png` | Grouped by type with eyebrow labels; chips scroll inside the sheet on mobile; keyboard hint row on desktop only |
| Search: no results | `search-empty-375.png` | `search-empty-1440.png` | Plain message with the query echoed; no suggestions are invented |
| Search: error | `search-error-375.png` | `search-error-1440.png` | Taken from a real API failure, not a mock. Shows "Try again" |
| Notifications: signed out | `notifications-signedout-375.png` | `notifications-signedout-1440.png` | Explains the member requirement, with a Sign in link; no badge. The radio reminder still works without an account |
| Notifications: blocked | `notifications-denied-375.png` | `notifications-denied-1440.png` | "Blocked" status and how to re-allow in browser settings; no Enable button |
| Notifications: member, off | `notifications-member-375.png` | `notifications-member-1440.png` | "No notifications yet. You have not missed anything." News and Radio switches, and Enable notifications (Midnight text on Cobalt) |
| Notifications: enable failed | `notifications-member-failed-375.png` | `notifications-member-failed-1440.png` | Headless has no push service, so subscribing fails. The panel shows an error and stays Off; it never claims success |
| Onboarding | `onboarding-375.png` | `onboarding-1440.png` | "Stay connected to Epe." with the exact description, toggles and the three buttons. Bottom card on mobile, corner card on desktop |

## Design consistency
- Palette only: Midnight, Navy, Royal Steel, Cobalt, Ice Blue, Cloud, Silver and Border. No gradients, glass or blur were added. Radii are 12–16 px on panels and pills on chips and buttons.
- SVG icons only. Every control is at least 44 px. Focus rings are a visible 3 px Cobalt, inset where a scroller would clip them.
- Motion: one short fade or slide on open, disabled under `prefers-reduced-motion`.

## Fixed during review
- Topic switches first rendered as the global checkbox (a check mark on a blue square). The global `input[type=checkbox]` rule out-ranked the module class, so the selectors were raised to `input.switch[type="checkbox"]` and the background image reset.
- The first screenshots caught the panel mid-fade. The capture now waits 350 ms; this was purely a capture-timing issue.
- The forum composer's Send button sat under the floating Support widget on phones (see `ROUTE_AUDIT_REPORT.md` P1-4).
