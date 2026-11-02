/**
 * The EPE LAWA mark.
 *
 * A riverine seal: a sun over water. It is drawn here rather than shipped as a raster so
 * it stays sharp at 24px and inherits the theme. No photograph is implied — this is an
 * illustration, and the hero art elsewhere says so explicitly.
 *
 * The mark is decorative. The wordmark beside it carries the name, so the SVG is hidden
 * from assistive technology and the link gets its accessible name from the text.
 */

type BrandMarkProps = {
  size?: number;
  /** Adds a thin light rim, used when the mark sits on a dark surface. */
  onDark?: boolean;
};

export function BrandMark({ size = 32, onDark = false }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
      className="brand-mark"
      data-on-dark={onDark ? "true" : undefined}
    >
      <rect width="40" height="40" rx="11" fill="currentColor" />
      <circle cx="27.2" cy="12.4" r="3.1" fill="var(--color-gold-500)" />
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
  );
}

/** Mark plus wordmark. Used in the header, the drawer and the footer. */
export function BrandLockup({ size = 32, onDark = false }: BrandMarkProps) {
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
