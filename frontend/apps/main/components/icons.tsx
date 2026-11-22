type ArrowIconProps = { size?: number; className?: string; "aria-hidden"?: boolean | string };

/**
 * Icon components — inline SVG only, no emojis.
 * Each icon accepts size (default 20) and className for styling.
 */

function normalizeAriaHidden(value?: boolean | string): boolean | undefined {
  if (value === undefined) return undefined;
  return value === true || value === "true";
}

export const NewsShortcutIcon = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h15v15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7h2"/><path d="M5 4v15a2 2 0 0 1-2 0M8 7h9v4H8zM8 14h9M8 17h6"/></svg>
);
export const ListenShortcutIcon = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="m7 8 10-5M15 12h3M15 16h3"/><circle cx="9" cy="14" r="2.5"/></svg>
);

export const NewspaperIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="12" height="20" rx="2" ry="2" />
    <path d="M8 6h12" />
    <path d="M8 10h12" />
    <path d="M8 14h12" />
    <path d="M8 18h12" />
  </svg>
);

export const NewsTabIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24">
    <rect x="1.5" y="1.5" width="21" height="21" rx="5.8" fill="currentColor" />
    <rect x="4.2" y="5.2" width="10.6" height="13.7" rx="2.4" fill="#78B6F2" />
    <path d="M10 4.2h7.4a2.8 2.8 0 0 1 2.8 2.8v10a2.8 2.8 0 0 1-2.8 2.8H10a2.8 2.8 0 0 1-2.8-2.8V7A2.8 2.8 0 0 1 10 4.2Z" fill="#F1F4FA" />
    <rect x="10.4" y="7" width="7.6" height="3.2" rx="1" fill="#A7C5F5" />
    <rect x="10.4" y="12" width="4.8" height="1.8" rx="0.9" fill="#A7C5F5" />
  </svg>
);

export const UsersIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.47" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const RadioIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20" />
    <path d="M12 10v4" />
    <path d="M8 15h8" />
  </svg>
);

export const MessageCircleIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.5 8.5 0 0 1-4-.9L3 21l1.9-5.5a8.5 8.5 0 0 1-.9-4A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
  </svg>
);

export const BuildingIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5v16h16V5l-8-4-8 4z" />
    <path d="M8 11h4" />
    <path d="M12 11h4" />
    <path d="M8 15h4" />
    <path d="M12 15h4" />
  </svg>
);

export const ImageIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

export const ChevronRightIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const ArrowRightIcon = ({ size = 18, className, "aria-hidden": ariaHidden }: ArrowIconProps) => (
  <svg aria-hidden={normalizeAriaHidden(ariaHidden)} className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const FilterIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16l-6.2 7.1v5.8L10.2 20v-7.9L4 5Z" />
  </svg>
);

export const SearchIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10.8" cy="10.8" r="6.6" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const MapPinIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 5.1-8 11-8 11S4 15.1 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="3.2" fill="currentColor" />
    <circle cx="12" cy="10" r="1.15" fill="var(--palette-cloud)" stroke="none" />
  </svg>
);

export const ArrowUpRightIcon = ({ size = 18, className, "aria-hidden": ariaHidden }: ArrowIconProps) => (
  <svg aria-hidden={normalizeAriaHidden(ariaHidden)} className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7" />
    <path d="M7 7h10v10" />
  </svg>
);

export const PlayIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 4.9v14.2a1 1 0 0 0 1.52.86l11-7.1a1 1 0 0 0 0-1.72l-11-7.1A1 1 0 0 0 7 4.9Z" />
  </svg>
);

export const PauseIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const VolumeOnIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18 5a9 9 0 0 1 0 14" />
  </svg>
);

export const VolumeOffIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    <path d="m16 9 5 6" />
    <path d="m21 9-5 6" />
  </svg>
);

export const HomeIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 10.7 9-7.5 9 7.5" />
    <path d="M5.5 9.6V21h13V9.6M9.25 21v-6.5h5.5V21" />
  </svg>
);

export const CompassIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="m15.6 8.4-2.3 4.9-4.9 2.3 2.3-4.9 4.9-2.3Z" />
  </svg>
);

export const UserIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.7" />
    <path d="M4.5 21v-1.3a7.5 7.5 0 0 1 15 0V21Z" />
  </svg>
);

export const BookmarkIcon = ({ size = 20, className, filled = false }: { size?: number; className?: string; filled?: boolean }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z" />
  </svg>
);

export const BellIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8.6a6 6 0 1 0-12 0c0 5-2.2 6.4-2.2 6.4h16.4S18 13.6 18 8.6Z" />
    <path d="M10.2 19a2.1 2.1 0 0 0 3.6 0" />
  </svg>
);

export const EyeIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3.1" />
  </svg>
);

export const ClockIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3.2 2" />
  </svg>
);

export const TrashIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16" />
    <path d="M9.5 7V4.8h5V7" />
    <path d="M6.4 7l.9 12.2a1.8 1.8 0 0 0 1.8 1.7h5.8a1.8 1.8 0 0 0 1.8-1.7L17.6 7" />
    <path d="M10.2 11v6M13.8 11v6" />
  </svg>
);

export const SignOutIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4.5H6.8A1.8 1.8 0 0 0 5 6.3v11.4a1.8 1.8 0 0 0 1.8 1.8h7.7" />
    <path d="M17 8.5 20.5 12 17 15.5" />
    <path d="M10 12h10.2" />
  </svg>
);

export const CalendarShortcutIcon = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 15h3"/></svg>
);

export const ClipboardIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

export const CheckIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
