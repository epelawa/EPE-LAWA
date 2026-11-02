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

export function SearchIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="10.5" cy="10.5" r="6.25" />
      <path d="m15.2 15.2 4.3 4.3" />
    </svg>
  );
}

export function SunIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  );
}

export function MoonIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M20 13.4A8.2 8.2 0 0 1 10.6 4a8.5 8.5 0 1 0 9.4 9.4z" />
    </svg>
  );
}

export function CloseIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function PlayIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PauseIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M9 5.5v13M15 5.5v13" strokeWidth="2.5" />
    </svg>
  );
}

export function DownloadIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M12 3.5v11m0 0 4-4m-4 4-4-4" />
      <path d="M4.5 17.5v1.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-1.5" />
    </svg>
  );
}

export function GalleryIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="8.75" cy="9.5" r="1.5" />
      <path d="m4 17 4.6-4.6a1.6 1.6 0 0 1 2.3 0L15 16.5m0 0 1.6-1.6a1.6 1.6 0 0 1 2.3 0L20.5 16.5" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4.5 12h14m0 0-5.5-5.5M18.5 12 13 17.5" />
    </svg>
  );
}

export function OfflineIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M3.5 8.6a14.5 14.5 0 0 1 6.3-3.3M15.7 6a14.5 14.5 0 0 1 4.8 2.6" />
      <path d="M6.6 12a10 10 0 0 1 3-1.7M14.9 10.6a10 10 0 0 1 2.5 1.4" />
      <path d="M9.7 15.4a4.5 4.5 0 0 1 4.6 0" />
      <path d="M12 18.6h.01" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function VolumeIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 9.5h3L11.5 6v12L7 14.5H4z" />
      <path d="M15.4 9.2a4 4 0 0 1 0 5.6M18 6.6a7.6 7.6 0 0 1 0 10.8" />
    </svg>
  );
}

export function VolumeOffIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 9.5h3L11.5 6v12L7 14.5H4z" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </svg>
  );
}

export function SpinnerIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className="ep-spin-icon">
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
    </svg>
  );
}

export function MenuIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 8.5h16M4 15.5h16" />
    </svg>
  );
}

