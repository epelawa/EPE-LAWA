/**
 * Hero illustration.
 *
 * Deliberately an illustration, not a photograph. We hold no licensed photograph of Epe
 * Division, and a stock image of a generic African waterfront presented as Epe would be a
 * lie told in pixels. This is a drawn scene: water, palms, a boat, the sun. It is captioned
 * as an illustration wherever it appears.
 *
 * Pure SVG, no network request, scales to any width, and reads on both themes.
 */

export default function HeroArt() {
  return (
    <figure className="hero-art">
      <svg
        viewBox="0 0 640 420"
        role="img"
        aria-label="Illustration of a riverine scene: a lagoon at sunset with palms and a canoe."
        className="hero-art__svg"
      >
        <defs>
          <linearGradient id="ep-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--hero-sky-top)" />
            <stop offset="100%" stopColor="var(--hero-sky-bottom)" />
          </linearGradient>
          <linearGradient id="ep-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--hero-water-top)" />
            <stop offset="100%" stopColor="var(--hero-water-bottom)" />
          </linearGradient>
        </defs>

        <rect width="640" height="420" rx="16" fill="url(#ep-sky)" />
        <circle cx="452" cy="132" r="46" fill="var(--color-gold-500)" opacity="0.92" />
        <circle cx="452" cy="132" r="70" fill="var(--color-gold-500)" opacity="0.12" />

        {/* Far bank */}
        <path d="M0 236h640v10H0z" fill="var(--hero-bank)" opacity="0.55" />

        {/* Palms, left cluster */}
        <g stroke="var(--hero-palm)" strokeWidth="4" fill="none" strokeLinecap="round">
          <path d="M116 236c2-30 4-52 6-72" />
          <path d="M122 164c-16-10-30-8-40 2M122 164c14-12 28-12 40-4M122 164c-8-16-6-30 4-40M122 164c10-14 24-18 36-14" />
          <path d="M86 236c1-22 2-38 4-52" />
          <path d="M90 184c-12-8-22-6-30 2M90 184c10-9 20-9 30-3M90 184c-6-12-4-22 4-30" />
        </g>

        {/* Palms, right cluster */}
        <g stroke="var(--hero-palm)" strokeWidth="3.5" fill="none" strokeLinecap="round">
          <path d="M560 236c-2-26-4-44-6-60" />
          <path d="M554 176c12-9 24-8 34-1M554 176c-12-9-24-8-34 0M554 176c7-13 6-24-1-33" />
        </g>

        {/* Water */}
        <rect y="246" width="640" height="174" fill="url(#ep-water)" />

        {/* Sun reflection */}
        <g stroke="var(--color-gold-500)" strokeWidth="3" strokeLinecap="round" opacity="0.5">
          <path d="M420 268h64M410 288h84M424 308h56M416 328h72" />
        </g>

        {/* Water ripples */}
        <g stroke="var(--hero-ripple)" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" fill="none">
          <path d="M40 278c14 0 14 7 28 7s14-7 28-7 14 7 28 7" />
          <path d="M96 314c14 0 14 7 28 7s14-7 28-7 14 7 28 7" />
          <path d="M56 352c14 0 14 7 28 7s14-7 28-7 14 7 28 7" />
          <path d="M470 348c14 0 14 7 28 7s14-7 28-7 14 7 28 7" />
          <path d="M498 372c14 0 14 7 28 7s14-7 28-7" />
        </g>

        {/* Canoe with paddler */}
        <g fill="none" stroke="var(--hero-canoe)" strokeWidth="4" strokeLinecap="round">
          <path d="M262 330c26 16 74 16 100 0" />
          <path d="M312 330v-26" />
          <circle cx="312" cy="298" r="7" fill="var(--hero-canoe)" stroke="none" />
          <path d="M318 322l26-22" />
        </g>
      </svg>
      <figcaption className="hero-art__caption">
        Illustration — a lagoon scene at dusk. Photography of Epe Division is licensed and credited
        before it appears on this site.
      </figcaption>
    </figure>
  );
}
