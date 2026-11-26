"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import heroImages from "../lib/hero-images.json";

type ImageVariant = { src: string; width: number };
type ImageFormat = { small: ImageVariant; large: ImageVariant };
export type HeroSlide = {
  slug: string;
  alt: string;
  label: string;
  author: string;
  license: string;
  source: string;
  licenseUrl: string;
  width: number;
  height: number;
  avif: ImageFormat;
  webp: ImageFormat;
  fallbackSrc: string;
};

/** Approved local Epe photographs; only the visible image and a small nearby window are requested. */
export const HERO_SLIDES = heroImages as unknown as readonly HeroSlide[];
const MAX_HERO_SLIDES = 60;
const INITIAL_SLIDE = 0;
const slides = HERO_SLIDES.slice(0, MAX_HERO_SLIDES);
const IMAGE_SIZES = "100vw";
const ROTATION_DELAY_MS = 7200;

type NetworkConnection = EventTarget & { saveData?: boolean; effectiveType?: string };
function getNetworkConnection(): NetworkConnection | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkConnection }).connection;
}
function isConstrainedConnection() {
  const connection = getNetworkConnection();
  return Boolean(connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g");
}
function uniqueVariants(format: ImageFormat): ImageVariant[] {
  const bySource = new Map<string, ImageVariant>();
  for (const variant of [format.small, format.large]) bySource.set(variant.src, variant);
  return [...bySource.values()].sort((a, b) => a.width - b.width);
}
function responsiveSrcSet(format: ImageFormat) {
  return uniqueVariants(format).map((variant) => `${variant.src} ${variant.width}w`).join(", ");
}
function closestVariant(format: ImageFormat, width: number) {
  return uniqueVariants(format).reduce((best, variant) =>
    Math.abs(variant.width - width) < Math.abs(best.width - width) ? variant : best,
  );
}

export default function HeroCarousel({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(Math.min(INITIAL_SLIDE, Math.max(0, slides.length - 1)));
  const photoRef = useRef<HTMLImageElement>(null);
  const [loadedIndex, setLoadedIndex] = useState(-1);
  const [activeCurrentSrc, setActiveCurrentSrc] = useState("");
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(query.matches);
    syncPreference();
    query.addEventListener("change", syncPreference);
    return () => query.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    const image = photoRef.current;
    if (!image?.complete || image.naturalWidth === 0) return;
    setActiveCurrentSrc(image.currentSrc || image.src);
    setLoadedIndex(index);
  }, [index]);

  useEffect(() => {
    if (loadedIndex !== index || !activeCurrentSrc || slides.length < 2 || focused || hovered || !pageVisible || reducedMotion || paused || isConstrainedConnection()) return;
    const timeout = window.setTimeout(() => {
      setActiveCurrentSrc("");
      setLoadedIndex(-1);
      setIndex((current) => (current + 1) % slides.length);
    }, ROTATION_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [loadedIndex, index, activeCurrentSrc, focused, hovered, pageVisible, reducedMotion, paused]);

  useEffect(() => {
    if (loadedIndex !== index || !activeCurrentSrc || slides.length < 2 || focused || hovered || !pageVisible || reducedMotion || paused || isConstrainedConnection()) return;
    const connection = getNetworkConnection();
    const count = Math.min(slides.length - 1, connection?.effectiveType === "3g" ? 1 : 2);
    const match = activeCurrentSrc.match(/-(\d+)\.(avif|webp)(?:\?.*)?$/i);
    const preferredWidth = match ? Number(match[1]) : 1280;
    const formatName = match?.[2]?.toLowerCase() === "avif" ? "avif" : "webp";
    for (let offset = 1; offset <= count; offset += 1) {
      const nextSlide = slides[(index + offset) % slides.length];
      const image = new window.Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      image.src = closestVariant(nextSlide[formatName], preferredWidth).src;
    }
  }, [loadedIndex, index, activeCurrentSrc, focused, hovered, pageVisible, reducedMotion, paused]);

  if (!slides.length) return null;
  const slide = slides[index] ?? slides[0];
  return (
    <>
      <div className="home-hero__visual" onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
        <figure
          className="home-hero__media"
          role="group"
          aria-roledescription="carousel"
          aria-label="Photographs of Epe"
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
          onPointerLeave={(event) => { if (event.pointerType === "mouse") setHovered(false); }}
        >
      <div className="home-hero__carousel-stage" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}`}>
        <picture>
          <source type="image/avif" srcSet={responsiveSrcSet(slide.avif)} sizes={IMAGE_SIZES} />
          <img
            key={slide.slug}
            ref={photoRef}
            className="home-hero__photo"
            src={slide.fallbackSrc}
            srcSet={responsiveSrcSet(slide.webp)}
            sizes={IMAGE_SIZES}
            alt={slide.alt}
            width={slide.width}
            height={slide.height}
            fetchPriority={index === INITIAL_SLIDE ? "high" : "auto"}
            loading="eager"
            decoding="async"
            onLoad={(event) => {
              setActiveCurrentSrc(event.currentTarget.currentSrc || event.currentTarget.src);
              setLoadedIndex(index);
            }}
          />
        </picture>
      </div>
        </figure>
        {children}
        {slides.length > 1 && !reducedMotion ? <button type="button" className="home-hero__rotation" onClick={() => setPaused((value) => !value)}>{paused ? "Play photos" : "Pause photos"}</button> : null}
      </div>
    </>
  );
}
