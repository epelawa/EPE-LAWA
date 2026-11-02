/*
 * Inline icons. No icon dependency: each glyph is a single path set at stroke-width 1.75,
 * sized by the component that uses it. All are decorative, so they are hidden from
 * assistive technology — the control or the text next to them carries the meaning.
 */

type IconProps = {
  /** Intrinsic size in pixels. CSS still controls the rendered size where it matters. */
  size?: number;
};

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
};

export function NewsIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M7 8.5h10M7 12h10M7 15.5h6" />
    </svg>
  );
}

export function PeopleIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

export function RadioIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="12" cy="12" r="1.75" />
      <path d="M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 15.4a4.8 4.8 0 0 0 0-6.8" />
      <path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 18.4a9 9 0 0 0 0-12.8" />
    </svg>
  );
}

export function ForumIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M20 14.5a2 2 0 0 1-2 2H8.5L4.5 20V5.5a2 2 0 0 1 2-2h11.5a2 2 0 0 1 2 2z" />
      <path d="M8.5 8.5h8M8.5 11.5h5" />
    </svg>
  );
}

export function BusinessIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 9.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M3 6.5 4.6 3h14.8L21 6.5" />
      <path d="M9.5 20v-5h5v5" />
    </svg>
  );
}

export function CheckIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function ChevronIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}
