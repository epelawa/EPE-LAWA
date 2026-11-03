/**
 * The EPE LAWA mark.
 * Uses the real brand mark (brand-logo.png).
 */

type BrandMarkProps = {
  size?: number;
  onDark?: boolean;
};

export function BrandMark({ size = 34, onDark = false }: BrandMarkProps) {
  return (
    <span className="flex items-center gap-2" data-on-dark={onDark ? "true" : undefined}>
      <img
        src="/brand-logo.png"
        alt=""
        width={size}
        height={size}
        decoding="async"
        className="rounded-lg"
        aria-hidden="true"
        onError={(event) => {
          const target = event.currentTarget as HTMLImageElement;
          target.style.display = "none";
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        aria-hidden="true"
        focusable="false"
        className="hidden"
        data-on-dark={onDark ? "true" : undefined}
      >
        <rect width="40" height="40" rx="11" fill="currentColor" />
        <circle cx="27.2" cy="12.4" r="3.1" fill="#10b981" />
        <path
          d="M7.4 21.4c3.2 0 3.2 3 6.4 3s3.2-3 6.4-3 3.2 3 6.4 3 3.2-3 6.4-3"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M7.4 28.2c3.2 0 3.2 3 6.4 3s3.2-3 6.4-3 3.2 3 6.4 3 3.2-3 6.4-3"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </span>
  );
}

export function BrandLockup({ size = 34, onDark = false }: BrandMarkProps) {
  return (
    <span className="flex items-center gap-2" data-on-dark={onDark ? "true" : undefined}>
      <BrandMark size={size} onDark={onDark} />
      <span className="flex flex-col">
        <span className="font-bold text-slate-900 tracking-tight">EPE LAWA</span>
        <span className="text-[11px] text-slate-500 uppercase tracking-wider">
          Epe Division
        </span>
      </span>
    </span>
  );
}
