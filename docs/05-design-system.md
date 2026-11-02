# EPE LAWA — Design System

**Document:** 05
**Status:** Active. Tokens below are approved direction. Component states must be verified in a real
browser at 320 px before they are considered done.

---

## 1. Direction

**Modern Riverine Editorial.** A civic, cultural and broadcasting identity rooted in Epe, with a
readable newspaper surface and a restrained operations workspace.

| Principle | Means |
| --- | --- |
| Useful before decorative | Every control has a real destination or data source |
| Editorial, not SaaS | Intentional headline scale, disciplined columns, varied rhythm, restrained rules |
| Mobile and data conscious | Designed for a 320 px phone on a metered connection first |
| Accessible by default | Semantic structure, keyboard reach, visible focus, 4.5:1 body contrast |
| Restrained | Two or three radii, shadows that separate rather than decorate, motion that explains |
| Authentic | Licensed Epe photography only. Never stock passing as Epe |

**Banned outright:** purple gradients · neon · glassmorphism without a stated reason · glow ·
floating blobs · sparkles · generic "AI" visual language · oversized meaningless typography ·
three-card rows with invented metrics · decorative emoji · rounded-card grids with no hierarchy.

---

## 2. Colour tokens

```css
:root {
  --color-teal-900: #073e42;
  --color-teal-700: #0B5A60;   /* Riverine Teal — primary */
  --color-teal-600: #0f6b72;
  --color-teal-100: #e3efef;

  --color-green-700: #2E7D32;  /* Palm Green — secondary / positive */
  --color-green-100: #e8f2e8;

  --color-gold-500: #E5A93C;   /* Ochre Gold — accent only */
  --color-gold-100: #fdf3e0;

  --color-charcoal-900: #1C1E21;  /* primary text */
  --color-charcoal-600: #4a4f57;  /* secondary text */
  --color-charcoal-300: #b8bcc2;  /* borders, disabled */

  --color-ivory-50:  #F9F8F6;   /* page background */
  --color-white:     #FFFFFF;   /* surfaces */

  --color-error-700: #B3261E;
  --color-error-100: #fdecea;
  --color-warning-700: #8a5a00;
  --color-warning-100: #fdf1dc;
}
```

### Verified contrast (WCAG AA)

| Pair | Ratio | Verdict |
| --- | ---: | --- |
| Charcoal 900 on Ivory 50 | 15.74:1 | Body text ✓ |
| Teal 700 on Ivory 50 | 7.48:1 | Links, headings ✓ |
| White on Teal 700 | 7.94:1 | Primary button ✓ |
| Green 700 on Ivory 50 | 4.83:1 | Normal text ✓ at these exact values |
| White on Green 700 | 5.13:1 | ✓ |
| Charcoal 900 on Gold 500 | 8.01:1 | Text on gold ✓ |
| Gold 500 on Ivory 50 | 1.96:1 | ✗ **Never for text or a meaningful border** |
| Charcoal 600 on Ivory 50 | 7.9:1 | Secondary text ✓ |

**Gold is a surface, not an ink.** Use it as a background with charcoal text, or as a 2 px rule — never
as a text colour and never as the only signal for a state.

Colour is never the only carrier of meaning. Every status has text or an icon.

---

## 3. Type

| Token | Size / line-height | Use |
| --- | --- | --- |
| `display` | 40–56 / 1.05 | Landing hero only |
| `h1` | 32 / 1.15 | Page title |
| `h2` | 26 / 1.2 | Section |
| `h3` | 20 / 1.3 | Subsection, card title |
| `body-lg` | 18 / 1.6 | Article body |
| `body` | 16 / 1.6 | Default |
| `small` | 14 / 1.5 | Metadata, help text |
| `label` | 13 / 1.4, `letter-spacing .04em`, uppercase | Eyebrow, table header |

- **Plus Jakarta Sans** — headings and interface.
- **Inter** — body and UI text.
- **Editorial serif** (source serif, licensed before launch) — article headlines only.
- Load two weights per family maximum, `display: swap`, self-hosted or `next/font`. No third-party
  font requests on a metered connection.
- Never a fixed height on a heading container. Text resize to 200% must not clip.

---

## 4. Space, radius, elevation, motion

```css
--space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
--space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

--radius-sm: 4px;   /* inputs, tags */
--radius-md: 8px;   /* cards, panels */
--radius-full: 9999px;  /* pills, avatars only */

--shadow-1: 0 1px 2px rgb(28 30 33 / .06);
--shadow-2: 0 2px 8px rgb(28 30 33 / .08);

--ease-out: cubic-bezier(.22,.61,.36,1);
--ease-in-out: cubic-bezier(.4,0,.2,1);
--dur-fast: 120ms; --dur-base: 200ms; --dur-slow: 320ms;
```

Three radii only. Two shadows only. Motion explains state change — never decorates. All of it is
wrapped in `@media (prefers-reduced-motion: reduce)`.

---

## 5. Layout

| Breakpoint | Width | Layout |
| --- | --- | --- |
| `xs` | < 480 | Single column, 16 px gutters |
| `sm` | 480–767 | Single column, 20 px gutters |
| `md` | 768–1023 | Two columns for listings |
| `lg` | 1024–1279 | Sidebar + content |
| `xl` | ≥ 1280 | Max width 1200, centred |

- Article measure: 62–72 characters. Never full viewport width on a large screen.
- Admin: sidebar 240 px, collapses to a drawer under 1024.
- Tables become labelled rows under 768 — not a horizontal scroll unless it is genuinely tabular and
  the container is focusable and labelled.
- Target sizes ≥ 44 × 44 px for anything touched.

---

## 6. Components and required states

Every interactive component needs: **default · hover · focus-visible · active · disabled**.
Every data component needs: **loading · empty · error · denied**.

| Component | Notes |
| --- | --- |
| Header / nav | Mobile disclosure: labelled trigger, `aria-expanded`, escape closes, focus returns |
| Button | `primary` (teal), `secondary` (outline), `ghost`, `danger`. Loading state keeps width |
| Input / textarea / select | Label always visible. Error text tied by `aria-describedby`. Never placeholder-as-label |
| Form error summary | Focused on submit failure, links to each field |
| Card | One elevation. No hover lift on non-interactive cards |
| Article summary | Headline, dek, author, date, category. No fake reading time |
| Prose | Sanitised rich text. Headings keep hierarchy. Figures with captions and credits |
| Radio player | idle · loading · buffering · playing · paused · offline · error · unavailable. `LIVE` only when verified |
| Comment | Visible · hidden tombstone · deleted · reported. Reply, edit, delete, report |
| Forum thread row | Title, category, author, reply count, last activity, pinned, locked |
| Poll | Options, vote, results, closed. One vote, changeable until close |
| Business card | Name, category, area, verified badge **only if verified**, rating, price band |
| Product card | Name, price in NGN, availability, business |
| Cart line | Quantity stepper with an accessible name, line total, remove |
| Order status | Stepper: pending → paid → preparing → out → delivered |
| Badge | `verified` (teal, with a check icon and the word), `unverified` (neutral outline) |
| Alert / notice | `info · success · warning · error`. Live region only when an update must be announced |
| Empty state | Icon, one sentence saying why it is empty, one next action where one exists |
| Skeleton | Matches the shape of what is loading. Never a spinner where a skeleton belongs |
| Pagination | Cursor or page, current page announced, disabled state honest |
| Dialog | Focus trapped, escape closes, focus restored, `aria-modal`, labelled |
| Toast | For confirmations only. Never for errors that need action |

---

## 7. Module-specific rules

**News.** Masthead is a publication, not a dashboard. Headline hierarchy is the design. Correction
notices sit at the top of the article body, dated. Comments are an addition to the article, never
competing with it.

**Who is Who.** Portrait-led, restrained, no ranking language. The verification badge links to what
verification means. Sources render as a real list, not a footnote asterisk.

**Radio.** The player is persistent but never takes more than one row on mobile. It does not autoplay.
An unavailable stream reads "Not live right now" with the archive offered — not an error, not a
broken play button.

**Forum.** Density is the point. Thread rows are scannable, not cards. A hidden post is a tombstone:
"[removed by a moderator]" with the reason if the policy allows, and the replies still make sense.

**Business.** Photos are the first impression and must be real. An unverified business never reads as
endorsed. Hours render as a table, not prose.

**Marketplace.** Price is the loudest element after the product name. Delivery cost and total appear
before payment, never after. A failed payment is a recoverable screen, not a dead end.

**Admin.** Information-first. Real counts. A denied action explains what capability is missing without
revealing data.

---

## 8. Accessibility baseline

- WCAG 2.2 AA target. Semantic HTML first; ARIA only when semantics cannot express it.
- One `h1` per page, heading order never skips.
- `:focus-visible` ring: 2 px teal 700 + 2 px offset, visible on every background used.
- Skip link first in the DOM.
- All images have `alt`; decorative images `alt=""`; captioned figures have real captions.
- Form errors announced, associated, and summarised.
- `prefers-reduced-motion` disables transforms and parallax, keeps opacity transitions.
- Test at 200% text zoom and 400% page zoom without loss of function.

---

## 9. Copy

Plain, specific, human. Write what a thing does.

| Never | Instead |
| --- | --- |
| "Unlock growth" | "List your business" |
| "Take your business to the next level" | "Reach customers in Epe" |
| "Launch faster" | "Publish a story" |
| "Something went wrong" | "We could not save your draft. Your text is still here. Try again." |
| "No data available" | "No stories have been published yet." |

No em-dash overuse. No invented numbers. No testimonials. No "coming soon".
