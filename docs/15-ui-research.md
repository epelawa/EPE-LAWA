# EPE LAWA — UI Research and Design Direction

**Status:** Research notes and design requirements; not a claim that a finished UI has been implemented or user-tested.\
**Research date:** 2 November 2026\
**Scope:** Phase 1 main site, editorial publication, broadcasting and staff administration.\
**Design authority:** [Approved design system](05-design-system.md) and [page specifications](04-page-specifications.md); owner requests ongoing reference research and an original, organic, human-designed outcome.

## 1. Research method and limitations

Search accessible public web sources such as Mobbin, Pinterest, editorial publications and established design-system documentation before substantial UI work. Review both mobile and desktop patterns where publicly accessible. Record the source, what was actually inspected, relevant patterns, limits and adaptation; do not claim that search snippets are visual inspection or user research.

On 2 November 2026, public Mobbin category pages were retrieved as text/metadata; the images themselves were not individually inspected. Pinterest search results were available, but direct board requests failed or returned 403; observations about Pinterest below are limited to indexed titles/descriptions, not a visual review of individual pins. GOV.UK, BBC and Subframe pages were retrieved as text. No screenshots, designs, logos, code or media were copied. Do not bypass paywalls, logins, robots/access restrictions, rate limits or platform terms. Use only permitted public sources and approved/licensed assets; investigate the original rights holder before reuse. Inspiration is not a licence to reproduce a design.

## 2. Reference register

| Source | What was actually available | What to examine / adapt without copying |
| --- | --- | --- |
| [Mobbin — mobile news-feed examples](https://mobbin.com/explore/mobile/screens/news-feed) | Public page text identifies examples and component labels for news feeds, article lists and mobile navigation; specific screenshots were not visually inspected. | Compare information density, headline-first scanning, accessible mobile navigation and purposeful hierarchy. Avoid transferring native-app patterns directly to a website without testing. |
| [Mobbin — web news examples](https://mobbin.com/explore/web/app-categories/news) | Public category text and labels include web navigation, lists, publishing and dashboard patterns; individual images were not visually inspected. | Investigate clear navigation, editorial discovery and functional staff workflows rather than cloning a product or adding out-of-scope social features. |
| [Pinterest — news web-design search result](https://www.pinterest.com/boogienen/news-web-design/) | Search index returned an editorial/news layout board; direct retrieval failed. Content of individual pins was not verified. | Use as a discovery starting point for headline and grid ideas only if the source is accessible; trace any useful image/design to its creator and licence. |
| [Pinterest — news-design search result](https://www.pinterest.com/abbywestcott/news-design/) | Search index returned a newspaper/editorial design board; direct retrieval was blocked. | Explore composition, typographic rhythm and print-to-web hierarchy when accessible, while adapting to small-screen and low-bandwidth needs. |
| [BBC — responsive news design article](https://www.bbc.com/news/blogs-the-editors-30520067) | Retrieved an older editorial account describing responsive layouts and mobile front-page density. This is historical, not proof of today's BBC interface or EPE LAWA user preferences. | Consider content prioritisation and mobile scrolling; validate with EPE LAWA's own users. |
| [GOV.UK Design System — components](https://design-system.service.gov.uk/components/) | Retrieved public component guidance for consistent, reusable interface parts. | Consult accessibility guidance for labels, form errors and interaction states; GOV.UK branding/design is not EPE LAWA's visual identity. Verify licensing before using any code. |
| [Subframe — editorial website examples](https://www.subframe.com/tips/editorial-website-design-examples) | Retrieved an example roundup describing visual hierarchy, photography and typography; examples include commercial and fashion contexts. | Learn about purposeful typographic hierarchy and image treatment, but do not assume luxury/fashion layouts meet local-news or accessibility needs. |

Sources are inspiration for **principles**, not evidence about Epe, approved public content, audience preferences or rights to use third-party materials. This is not a completed competitor audit or an excuse to introduce unapproved Phase 2–5 functionality.

## 3. Original EPE LAWA visual direction

- **Modern Riverine Editorial:** a locally grounded, civic and broadcasting identity; main site is warm and welcoming, news is a readable digital newspaper, and admin is restrained and efficient. The three share foundations without being visually interchangeable.
- **Editorial, not SaaS:** intentional headline scale, disciplined columns, varied content rhythm, restrained rules and generous but useful spacing. Avoid repetitive rounded-card grids, generic dashboard templates, neon, purple/pink glow, glassmorphism, ornamental gradients and unnecessary motion.
- **Authenticity:** use licensed, owner-approved photography that genuinely represents Epe, with captions/credits and cultural context. Do not substitute unrelated stock, fabricate local scenes, portray AI-generated imagery as authentic reportage, copy a source design or distort the official logo.
- **Human and useful:** use natural copy, clear context and purposeful interactions; design for both real content and honest empty/error states. No demo records, fake activity, invented articles, fake live indicators or empty cosmetic features. Do not expose future functions as active.
- **Mobile-first:** design for low-data, affordable Android and desktop; prioritise legibility, compact navigation, intentional video/audio loading and actual accessible focus/touch states. Test with representative users when available; research and gallery references are not user validation.

### Approved palette guardrails

The owner-directed palette remains the design baseline: Riverine Teal `#0B5A60`, Palm Green `#2E7D32`, Ochre Gold `#E5A93C`, Deep Charcoal `#1C1E21`, and Warm Ivory `#F9F8F6`. Refer to [05-design-system.md](05-design-system.md#3-proposed-colour-tokens-and-contrast) for calculated pairs and validation. Use colours selectively, preserve clear hierarchy, and test actual component/hover/focus/error contrast. Gold on ivory does not meet text contrast; use dark text on gold when appropriate. Changes to brand tokens require owner review rather than importing a reference site's palette.

## 4. Workflow for each substantial UI task

1. Read the requirements, sitemap, design system, page specification and existing components; identify the approved phase and real data states.
2. Review several permitted reference sources including Mobbin, Pinterest when accessible, and other relevant editorial, broadcast or accessibility references. Record exactly what was inspected and the access limits. Never automatically scrape restricted or copyrighted assets.
3. Distil layout and interaction principles, then produce an original EPE LAWA-specific composition using the approved palette, typography direction and authentic approved content. Do not copy a third-party screen pixel-for-pixel.
4. Implement real approved behaviour and distinct empty, loading, failure, success and focus states; preserve no-seed/no-demo rules. Never fabricate an active stream, content or metrics to make a layout look complete.
5. Test responsive layouts, keyboard access, contrast and the actual empty/error/data conditions. Obtain design review and update this register or the relevant design document with sources and decisions.

## 5. Open inputs

The owner supplied the composite EPE LAWA logo on 2 November 2026 and instructed that it be used whole without cropping. The original is preserved in `frontend/apps/main/public/brand-logo.png`; resized assets retain the entire canvas. Confirm ongoing rights to all elements of the supplied artwork. Authentic licensed Epe photography, programme details, real articles/media, mobile usability participants and exact final typeface licences remain outstanding. The radio stream and embedding rights remain launch blockers. Future Phase 2–5 designs must receive their own scope and safety approval.

## 6. Audit and system-page increment

The November audit and system-page work uses the reference register above, the existing palette and functional error/connection states; it does not reproduce reference screens or assert that the listed Pinterest images were inspected. See [16-audit-and-delivery.md](16-audit-and-delivery.md) for implementation, verification and limitations.
