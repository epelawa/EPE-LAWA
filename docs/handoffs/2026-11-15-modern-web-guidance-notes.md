# Modern Web Guidance — applied checklist for EPE-LAWA News and Admin

**Source checked:** 2026-11-15. This checklist applies to the current News/cover/Advertise PR and the separate follow-up Admin redesign. It is not an audit or certification of unrelated EPE-LAWA routes.

## Sources

- [GoogleChrome/modern-web-guidance repository](https://github.com/googlechrome/modern-web-guidance): the repository describes a CLI-backed set of modern platform, browser-compatibility, accessibility, performance, privacy and responsive-design guides, with `search`, `retrieve` and `legacy-scan` workflows.
- [Chrome for Developers: Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance): project overview and installation options.
- [Get started with Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance/get-started): explains searching for a guide ID and retrieving its implementation guidance, Baseline compatibility tiers, and the need for fallbacks when a feature is not widely available.

The CLI guide IDs consulted include `responsive-design`, `typography`, `css-layout`, `navbar`, `optimize-image-priority`, `forms`, `accessible-error-announcement`, `privacy`, `secure-external-subresources`, and `content-first-noise-reduction`.

## Requirements applied to these PRs

- **Responsive layout and reading:** use intrinsic grid/flex sizing and aspect-ratio media frames; confirm 320 CSS-pixel reflow and larger widths; use unitless line-height, rem-based text sizes, and bounded `clamp()` values that combine relative and viewport units; avoid fixed heights that clip copy; use balanced headline wrapping and readable line lengths.
- **Cover loading:** mark only the actual LCP lead/hero image `fetchpriority="high"`; never lazy-load that image; keep above-the-fold cards eager where they are actually visible, use normal browser priority for ordinary images, and lazy-load offscreen cards. Omit `fetchpriority="auto"`.
- **Forms and errors:** keep visible labels, native input constraints and server-side validation; describe fields and errors programmatically; reveal validation after interaction rather than showing premature errors while typing; announce broken-image feedback accessibly. Newsletter and ad intake remain non-collecting while delivery is unavailable.
- **Privacy and external media:** explain that an external image host receives the visitor’s IP; set `referrerPolicy="no-referrer"` for cover previews and published images; keep document `Referrer-Policy` strict; validate public HTTPS URLs server-side. SRI is not appropriate for owner-supplied mutable image URLs because there is no pinned, known-good image digest; the URLs are images, not executable scripts.
- **Content and compatibility:** keep the editorial layout stable and avoid intrusive signup prompts; reserve image space; preserve current-page semantics and keyboard focus. Do not make unsupported Anchor Positioning or other limited-availability features a required path.

## Scope note

The shared public navigation is already a keyboard-operable drawer and exposes `aria-current="page"`; this News PR does not replace that shared cross-site interaction model. A native-popover/navigation-tree refactor is a separate, broader project decision. The follow-up Admin PR must use this same guidance while preserving authorized staff actions and same-tab, first-click navigation. Neither PR implies that unrelated pages have been audited or modernized.
