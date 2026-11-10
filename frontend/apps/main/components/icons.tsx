type ArrowIconProps = { size?: number; className?: string; "aria-hidden"?: boolean | string };

/**
 * Icon components — inline SVG only, no emojis.
 * Each icon accepts size (default 20) and className for styling.
 */

function normalizeAriaHidden(value?: boolean | string): boolean | undefined {
  if (value === undefined) return undefined;
  return value === true || value === "true";
}

export const NewspaperIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="12" height="20" rx="2" ry="2" />
    <path d="M8 6h12" />
    <path d="M8 10h12" />
    <path d="M8 14h12" />
    <path d="M8 18h12" />
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

export const ArrowUpRightIcon = ({ size = 18, className, "aria-hidden": ariaHidden }: ArrowIconProps) => (
  <svg aria-hidden={normalizeAriaHidden(ariaHidden)} className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7" />
    <path d="M7 7h10v10" />
  </svg>
);
