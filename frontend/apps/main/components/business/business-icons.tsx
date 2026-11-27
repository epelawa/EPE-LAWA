/** Small stroke icons used only by the business directory and profile (decorative: aria-hidden). */
type P = { size?: number };
const svg = (size: number, children: React.ReactNode) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
export const PhoneIcon = ({ size = 18 }: P) => svg(size, <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />);
export const ChatIcon = ({ size = 18 }: P) => svg(size, <><path d="M3 21l1.7-4.3A8.5 8.5 0 1 1 8 19.6Z" /><path d="M9 10.5c.5 1.6 1.9 3 3.5 3.5l1.2-1.1 2 1-.4 1.6c-3.4.3-7.1-3.4-6.8-6.8l1.6-.4 1 2Z" /></>);
export const GlobeIcon = ({ size = 18 }: P) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>);
export const MailIcon = ({ size = 18 }: P) => svg(size, <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>);
export const RouteIcon = ({ size = 18 }: P) => svg(size, <><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z" /><circle cx="12" cy="11" r="2.2" /></>);
export const BadgeCheckIcon = ({ size = 14 }: P) => svg(size, <><path d="M12 2.8 14.4 4.6l3-.1.9 2.9 2.4 1.8-.9 2.8.9 2.8-2.4 1.8-.9 2.9-3-.1L12 21.2l-2.4-1.8-3 .1-.9-2.9-2.4-1.8.9-2.8-.9-2.8 2.4-1.8.9-2.9 3 .1Z" /><path d="m8.8 12 2.2 2.2 4.2-4.4" /></>);
export const StarIcon = ({ size = 14 }: P) => svg(size, <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />);
export const LandmarkIcon = ({ size = 18 }: P) => svg(size, <><path d="M4 21h16M5 21V10l7-5 7 5v11" /><path d="M10 21v-5h4v5" /></>);
export const SlidersIcon = ({ size = 18 }: P) => svg(size, <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>);
export const CloseIcon = ({ size = 16 }: P) => svg(size, <path d="M6 6l12 12M18 6 6 18" />);
export const FlagIcon = ({ size = 18 }: P) => svg(size, <><path d="M5 21V4" /><path d="M5 4h11l-1.5 4L16 12H5" /></>);
