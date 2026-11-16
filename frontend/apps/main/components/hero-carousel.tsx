"use client";

import { useEffect, useState } from "react";
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
const INITIAL_SLIDE = 2;
const slides = HERO_SLIDES.slice(0, MAX_HERO_SLIDES);
const IMAGE_SIZES = "(max-width: 600px) calc(100vw - 32px), (max-width: 1200px) calc(100vw - 48px), 1200px";

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

export default function HeroCarousel() {
  const [index, setIndex] = useState(Math.min(INITIAL_SLIDE, Math.max(0, slides.length - 1)));
  const [loadedIndex, setLoadedIndex] = useState(-1);
  const [activeCurrentSrc, setActiveCurrentSrc] = useState("");

  useEffect(() => {
    if (loadedIndex !== index || !activeCurrentSrc || slides.length < 2 || isConstrainedConnection()) return;
    const connection = getNetworkConnection();
    const count = connection?.effectiveType === "3g" ? 1 : 2;
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
  }, [loadedIndex, index, activeCurrentSrc]);

  if (!slides.length) return null;
  const slide = slides[index] ?? slides[0];
  const previous = slides[(index - 1 + slides.length) % slides.length];
  const next = slides[(index + 1) % slides.length];
  const moveTo = (nextIndex: number) => {
    setActiveCurrentSrc("");
    setLoadedIndex(-1);
    setIndex((nextIndex + slides.length) % slides.length);
  };

  return (
    <figure className="home-hero__media" aria-label="Photographs of Epe">
      <div className="home-hero__carousel-stage">
        <picture>
          <source type="image/avif" srcSet={responsiveSrcSet(slide.avif)} sizes={IMAGE_SIZES} />
          <img
            key={slide.slug}
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
              setActiveCurrentSrc(event.currentTarget.currentSrc);
              setLoadedIndex(index);
            }}
          />
        </picture>
      </div>
      <figcaption className="home-hero__caption ep-container">
        <div className="home-hero__credit">
          <span className="home-hero__slide-label">{slide.label}</span>
          <span>Photo by <a href={slide.source} target="_blank" rel="noopener noreferrer">{slide.author}</a> · <a href={slide.licenseUrl} target="_blank" rel="noopener noreferrer">{slide.license}</a></span>
        </div>
        <div className="home-hero__controls" role="group" aria-label="Epe photo gallery controls">
          <span className="home-hero__counter" aria-live="polite">Photo {index + 1} of {slides.length}</span>
          <button type="button" className="home-hero__control" aria-label={`Previous photo: ${previous.label}`} onClick={() => moveTo(index - 1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button type="button" className="home-hero__control" aria-label={`Next photo: ${next.label}`} onClick={() => moveTo(index + 1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
