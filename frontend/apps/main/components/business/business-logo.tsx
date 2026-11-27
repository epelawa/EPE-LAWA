"use client";

import { useEffect, useRef, useState } from "react";
import { businessInitials } from "../../lib/business-directory";
import styles from "./business.module.css";

/**
 * A business's uploaded logo, or its initials on a neutral tile when there is no logo or the file fails
 * to load. Never a stock or external image. Decorative by default: the card or heading names the business.
 */
export default function BusinessLogo({ src, name, size = "md", alt = "" }: { src: string | null; name: string; size?: "sm" | "md" | "lg"; alt?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const image = useRef<HTMLImageElement>(null);
  const showImage = Boolean(src) && failed !== src;
  useEffect(() => {
    if (showImage && src && image.current?.complete && image.current.naturalWidth === 0) setFailed(src);
  }, [src, showImage]);
  const px = size === "lg" ? 96 : size === "sm" ? 44 : 64;
  if (!showImage) {
    return <span className={`${styles.logo} ${styles[`logo_${size}`]} ${styles.logoInitials}`} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>{businessInitials(name)}</span>;
  }
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img ref={image} className={`${styles.logo} ${styles[`logo_${size}`]}`} src={src as string} alt={alt} width={px} height={px} loading={size === "lg" ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(src)} />;
}
