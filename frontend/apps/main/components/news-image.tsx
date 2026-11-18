"use client";

import { useState } from "react";

type Props = { src?: string | null; alt: string; className: string; loading?: "eager" | "lazy"; fetchPriority?: "high" | "low" | "auto" };

/** A missing or broken cover falls back to the local EPE LAWA logo, not a broken image. */
export default function NewsImage({ src, alt, className, loading = "lazy", fetchPriority }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const fallback = !src || failed === src;
  return <img className={className} data-news-fallback={fallback ? "true" : undefined} src={fallback ? "/brand-logo.png" : src} alt={fallback ? "EPE LAWA logo" : alt} loading={loading} fetchPriority={fetchPriority} decoding="async" referrerPolicy="no-referrer" onError={() => { if (!fallback && src) setFailed(src); }} />;
}
