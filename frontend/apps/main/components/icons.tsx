"use client";

/**
 * Icon components — SVG only, no emojis.
 * Each icon accepts size (default 20) and className for styling.
 */

export const NewspaperIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="8" y="2" width="12" height="20" rx="2" ry="2" />
    <path d="M8 6h12" />
    <path d="M8 10h12" />
    <path d="M8 14h12" />
    <path d="M8 18h12" />
  </svg>
);

export const UsersIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.47" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const RadioIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20" />
    <path d="M12 10v4" />
    <path d="M8 15h8" />
  </svg>
);

export const MessageCircleIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.5 8.5 0 0 1-7.6-4.7 8.38 8.38 0 0 1-.9-3.8 8.36 8.36 0 0 1 3.4-7.6 8.36 8.36 0 0 1 7.6-0.9 8.38 8.38 0 0 1 3.8 3.4z" />
    <path d="M16 11.5a4 4 0 0 1-7.744-0.077L8.506 6.506L7.213 6.213a4 4 0 0 1 0-5.656l8-8a4 4 0 0 1 5.656 0l8 8a4 4 0 0 1 0 5.656l-1.293 1.293-1.293 1.293a4 4 0 0 1 -0.078 7.744z" />
  </svg>
);

export const BuildingIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 5v16h16V5l-8-4-8 4z" />
    <path d="M8 11h4" />
    <path d="M12 11h4" />
    <path d="M8 15h4" />
    <path d="M12 15h4" />
  </svg>
);

export const ImageIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

export const ChevronRightIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
