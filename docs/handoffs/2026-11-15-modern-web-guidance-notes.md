# Modern Web Guidance — applied checklist for EPE-LAWA News, navigation, and Admin

**Source checked:** 2026-11-15. This checklist covers the consolidated News, cover, Advertise, shared public navigation, and Admin dashboard work. It is not an audit or certification of unrelated EPE-LAWA routes.

## Sources

- [GoogleChrome/modern-web-guidance repository](https://github.com/googlechrome/modern-web-guidance): the repository describes a CLI-backed set of modern platform, browser-compatibility, accessibility, performance, privacy and responsive-design guides, with `search`, `retrieve` and `legacy-scan` workflows.
- [Chrome for Developers: Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance): project overview and installation options.
- [Get started with Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance/get-started): explains searching for a guide ID and retrieving implementation guidance, Baseline compatibility tiers, and the need for fallbacks when a feature is not widely available.

The CLI guide IDs consulted include `responsive-design`, `typography`, `css-layout`, `navbar`, `optimize-image-priority`, `forms`, `accessible-error-announcement`, `privacy`, `secure-external-subresources`, and `content-first-noise-reduction`.

## Requirements applied

- **Responsive reading and layout:** use intrinsic grid/flex sizing and aspect-ratio media frames; verify narrow reflow and enlarged text; use rem-based text, unitless line-height, balanced headlines, bounded `clamp()` sizes and readable line lengths; avoid fixed heights that clip content.
- **Navigation:** use ordinary same-tab links for primary destinations, mark the current destination with `aria-current="page"`, and put secondary destinations in a native keyboard-operable `<details>/<summary>` disclosure. Escape closes the disclosure and returns focus; pointer-outside closes it; no hamburger, drawer, modal scrim or focus trap is required. Keep the utility bar and responsive primary links visible without relying on unsupported Anchor Positioning.
- **Admin dashboard:** show only counts returned by the real database and only when the corresponding staff capability is granted. Render an explicit unavailable state when a count cannot be verified instead of inventing a zero; omit mock analytics, sample feed items and private member/order/report details. Keep the existing authorized staff destinations as same-tab actions and reflow the cards at narrower widths.
- **Cover loading:** prioritize only the actual lead/LCP image; do not lazy-load it. Keep genuinely visible lead cards eager, lazy-load offscreen cards, reserve image space and use full-bleed `object-fit: cover`. Set `referrerPolicy="no-referrer"` for remote cover images and previews.
- **Forms, errors, and privacy:** keep visible labels, native constraints and server-side validation; associate field errors programmatically and reveal them after interaction; announce failed-image previews accessibly. Restrict automatically loaded external images to exact trusted HTTPS hosts. Newsletter and advertising intake remain non-collecting while delivery and secure intake are unavailable.
- **Compatibility and motion:** keep the layout usable without newer popover/anchor-positioning features; respect reduced-motion preferences and preserve visible keyboard focus.

## Current scope note

The consolidated feature replaces the public drawer with a global forest-green reference navbar, while preserving the protected Member dashboard link and theme control in the More disclosure. The Admin dashboard redesign uses only capability-gated live queues. Screenshots and release evidence belong to this focused PR. No claim is made that unrelated pages have been audited or modernized.
