import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, SVGProps } from "react";

export { LiveField, SaveState, SubmitButton, controlError, validateField, type FieldRules } from "./forms";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export function buttonClassName(variant: ButtonVariant = "primary"): string { return `ep-button ep-button--${variant}`; }
export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) { return <button className={`${buttonClassName(variant)} ${className}`.trim()} {...props} />; }
export function Container({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`ep-ui-container ${className}`.trim()} {...props} />; }
export function EmptyState({ title, description, children, className = "" }: { title: string; description?: string; children?: ReactNode; className?: string }) { return <section className={`ep-ui-empty ${className}`.trim()} aria-label={title}><h2>{title}</h2>{description ? <p>{description}</p> : null}{children ? <div className="ep-ui-empty__actions">{children}</div> : null}</section>; }
export function Alert({ children, variant = "info", className = "" }: { children: ReactNode; variant?: "info" | "success" | "warning" | "error"; className?: string }) { return <div className={`ep-ui-alert ep-ui-alert--${variant} ${className}`.trim()} role={variant === "error" ? "alert" : "status"}>{children}</div>; }
type IconProps = SVGProps<SVGSVGElement> & { size?: number };
function Icon({ size = 20, children, ...props }: IconProps & { children: ReactNode }) { return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>; }
export function CloseIcon(props: IconProps) { return <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>; }
export function SearchIcon(props: IconProps) { return <Icon {...props}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></Icon>; }
export function SunIcon(props: IconProps) { return <Icon {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></Icon>; }
export function MoonIcon(props: IconProps) { return <Icon {...props}><path d="M20.4 15.4A8.5 8.5 0 0 1 8.6 3.6 8.6 8.6 0 1 0 20.4 15.4Z" /></Icon>; }
export function MenuIcon(props: IconProps) { return <Icon {...props}><path d="M4 6h16M4 12h16M4 18h16" /></Icon>; }
export function CheckIcon(props: IconProps) { return <Icon {...props}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>; }
export function WrenchIcon(props: IconProps) { return <Icon {...props}><path d="M14.7 6.3a4 4 0 0 0 5 5L21 21l-3 .3L14 17.3a4 4 0 0 0-5-5L7.6 4.6 4.6 7.6" transform="translate(1 -1)" /></Icon>; }
export function DatabaseIcon(props: IconProps) { return <Icon {...props}><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></Icon>; }
export function ImageIcon(props: IconProps) { return <Icon {...props}><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><circle cx="9" cy="9" r="1.6" /><path d="m4.5 17 4.2-4.2a1.5 1.5 0 0 1 2.1 0L16 18m-1.6-4.6 1.5-1.5a1.5 1.5 0 0 1 2.1 0l2 2" /></Icon>; }
export function ShieldIcon(props: IconProps) { return <Icon {...props}><path d="M12 3.2 19 6v5.4c0 4.4-2.8 7.6-7 9.4-4.2-1.8-7-5-7-9.4V6z" /><path d="m9.2 11.8 2 2 3.8-4" /></Icon>; }
export function ChartIcon(props: IconProps) { return <Icon {...props}><path d="M4 20h16" /><path d="M7 20v-6m5 6V8m5 12V4" /></Icon>; }
export function InboxIcon(props: IconProps) { return <Icon {...props}><path d="M3.5 13.5 6 5h12l2.5 8.5v4a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /><path d="M3.5 13.5H9a3 3 0 0 0 6 0h5.5" /></Icon>; }
export function ClockIcon(props: IconProps) { return <Icon {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Icon>; }
export function BoltIcon(props: IconProps) { return <Icon {...props}><path d="M13 3 5.5 13H11l-1 8 7.5-10H12z" /></Icon>; }
// Editorial primitives follow the public ui-* class contract.
export function PageFrame({ children, className="", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`ui-page ${className}`} {...props}>{children}</div>; }
export function PageIntro({ eyebrow, title, description, actions, meta }: { eyebrow:string; title:ReactNode; description?:ReactNode; actions?:ReactNode; meta?:ReactNode }) { return <header className="ui-page-intro"><div><p className="ui-eyebrow">{eyebrow}</p><h1>{title}</h1>{description ? <div>{description}</div> : null}{meta ? <div className="ui-meta">{meta}</div> : null}</div>{actions ? <div>{actions}</div> : null}</header>; }
export function Panel({ children, className="", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`ui-panel ${className}`} {...props}>{children}</div>; }
export function SectionHeading({ eyebrow, title, description, action, id }: { eyebrow?:string; title:ReactNode; description?:ReactNode; action?:ReactNode; id?:string }) { return <div className="ui-section-heading"><div>{eyebrow ? <p className="ui-eyebrow">{eyebrow}</p> : null}<h2 id={id}>{title}</h2>{description ? <div className="ui-muted">{description}</div> : null}</div>{action}</div>; }
export function EmptyPanel({ title, description, actions, icon }: { title:ReactNode; description:ReactNode; actions?:ReactNode; icon?:ReactNode }) { return <div className="ui-empty">{icon ? <div aria-hidden="true">{icon}</div> : null}<h2>{title}</h2><div className="ui-muted">{description}</div>{actions ? <div className="ui-actions">{actions}</div> : null}</div>; }
export function StatusBadge({ children, tone="neutral" }: { children:ReactNode; tone?:"neutral"|"success"|"warning"|"danger" }) { return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>; }
export function Notice({ children, tone="neutral", className="", ...props }: HTMLAttributes<HTMLDivElement> & { tone?:"neutral"|"success"|"warning"|"danger" }) { return <div className={`ui-notice ui-notice--${tone} ${className}`} {...props}>{children}</div>; }
export function TextLink({ href, children }: { href:string; children:ReactNode }) { return <a href={href} className="ui-text-link">{children}<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></a>; }
