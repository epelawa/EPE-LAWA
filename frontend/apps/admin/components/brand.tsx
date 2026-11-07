type BrandMarkProps = { size?: number; onDark?: boolean };
export function BrandMark({ size = 34 }: BrandMarkProps) {
  return <span className="brand-mark"><img src="/brand-logo.png" alt="" width={size} height={size} decoding="async" className="brand-mark__img" aria-hidden="true" /></span>;
}
export function BrandLockup({ size = 34, onDark = false }: BrandMarkProps) {
  return <span className="brand-lockup" data-on-dark={onDark ? "true" : undefined}><BrandMark size={size} /><span className="brand-lockup__text"><span className="brand-lockup__name">EPE LAWA</span><span className="brand-lockup__tagline">Epe Division</span></span></span>;
}
