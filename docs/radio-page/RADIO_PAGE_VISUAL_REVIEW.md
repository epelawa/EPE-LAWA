# Radio page visual review (turn 5)

Screenshots are full-page captures from the production build with fixture data (`scripts/page-screens.mjs`).

| File | Notes |
|---|---|
| `desktop-1440-radio.png` | Two-column dark band: intro left, player card right. Station buttons sit side by side, and the slim sponsor card shows the logo fallback. The guide shows the honest "being updated" state. |
| `tablet-768-radio.png` | Columns stack; the player stays full width. |
| `mobile-390-radio.png` | Single column. Listen live and Explore programmes stack, and every control is at least 44px. |
| `mobile-320-radio.png` | Smallest width: the station name wraps and nothing scrolls horizontally. |
| `mobile-390-radio-schedule-fixture.png` | Fixture schedule: day selector (Sun–Fri visible, Sat reachable by scroll), the on-air slot marked, and the `.ics` link. |

## Known visual notes
- In full-page captures the fixed Support button is drawn at its first-viewport position, so it appears to float over the player card mid-page. In the browser it stays pinned to the viewport's bottom-right (right 12px, bottom 84px) and is user-draggable, unchanged from turn 4.
- The layout uses `min-width: 0` and wrapping (no truncation) so longer Yorùbá strings can grow. The audit and screenshots ran in English only; Yorùbá layout and wording still need an owner/native-speaker review.
