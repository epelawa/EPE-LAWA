/**
 * The EPE LAWA mark.
 *
 * Uses the real brand mark (brand-logo.png) shipped in /public. The inline SVG below
 * is only the fallback if the image fails to load, so the header never shows a blank
 * space. The mark is decorative; the wordmark beside it carries the accessible name.
 */

type BrandMarkProps = {
  size?: number;
  /** Adds a subtle white rim when the mark sits on a dark surface. */
  onDark?: boolean;
};

export function BrandMark({ size = 34, onDark = false }: BrandMarkProps) {
  return (
    <span className="brand-mark" data-on-dark={onDark ? "true" : undefined}>
      <img
        src="/brand-logo.png"
        alt=""
        width={size}
        height={size}
        decoding="async"
        className="brand-mark__img"
        aria-hidden="true"
        onError={(event) => {
          const target = event.currentTarget as HTMLImageElement;
          target.style.display = "none";
        }}
      />
      {/* Fallback riverine seal if the image is missing. Never shows an empty slot. */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        aria-hidden="true"
        focusable="false"
        className="brand-mark__fallback"
        data-on-dark={onDark ? "true" : undefined}
      >
        <rect width="40" height="40" rx="11" fill="currentColor" />
        <circle cx="27.2" cy="12.4" r="3.1" fill="hsl(var(--accent))" />
        <path
          d="M7.4 21.4c3.2 0 3.2 3 6.4 3s3.2-3 6.4-3 3.2 3 6.4 3 3.2-3 6.4-3"
          fill="none"
          stroke="var(--color-white)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M7.4 28.2c3.2 0 3.2 3 6.4 3s3.2-3 6.4-3 3.2 3 6.4 3 3.2-3 6.4-3"
          fill="none"
          stroke="var(--color-white)"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </span>
  );
}

/** Mark plus wordmark. Used in the header, the drawer and the footer. */
export function BrandLockup({ size = 34, onDark = false }: BrandMarkProps) {
  return (
    <span className="brand-lockup" data-on-dark={onDark ? "true" : undefined}>
      <BrandMark size={size} onDark={onDark} />
      <span className="brand-lockup__text">
        <span className="brand-lockup__name">EPE LAWA</span>
        <span className="brand-lockup__tagline">Epe Division</span>
      </span>
    </span>
  );
}
