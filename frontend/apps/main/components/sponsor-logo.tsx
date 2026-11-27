"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sponsor logo with the same recovery as news covers (components/news-image.tsx):
 * a missing or broken logo falls back to the local EPE LAWA logo instead of a
 * broken image or an initial. The image is decorative (alt=""): the link around it
 * already names the business, so screen readers do not hear the name twice.
 */
export default function SponsorLogo({ src, className, fallbackClassName, size = 56 }: { src: string | null; name?: string; className: string; fallbackClassName: string; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  const image = useRef<HTMLImageElement>(null);
  const fallback = !src || failed === src;
  useEffect(() => {
    // A fast failure can occur before React attaches the error handler.
    if (!fallback && src && image.current?.complete && image.current.naturalWidth === 0) setFailed(src);
  }, [src, fallback]);
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img
    ref={image}
    className={fallback ? `${className} ${fallbackClassName}` : className}
    data-sponsor-fallback={fallback ? "true" : undefined}
    src={fallback ? "/brand-logo.webp" : src}
    alt=""
    width={size}
    height={size}
    loading="lazy"
    decoding="async"
    referrerPolicy="no-referrer"
    onError={() => { if (!fallback && src) setFailed(src); }}
  />;
}
