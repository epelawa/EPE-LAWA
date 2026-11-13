"use client";

import { useEffect, useState } from "react";
import heroImages from "../lib/hero-images.json";
import { MapPinIcon } from "./icons";

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

/** Kept local, sourced, and capped so future additions do not cause bulk requests. */
export const HERO_SLIDES = heroImages as unknown as readonly HeroSlide[];
const MAX_HERO_SLIDES = 60;
const slides = HERO_SLIDES.slice(0, MAX_HERO_SLIDES);
const IMAGE_SIZES = "(max-width: 600px) calc(100vw - 40px), (max-width: 800px) 46vw, 560px";

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
  const [index, setIndex] = useState(0);
  const [automaticMotionDisabled, setAutomaticMotionDisabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [loadedIndex, setLoadedIndex] = useState(-1);
  const [activeCurrentSrc, setActiveCurrentSrc] = useState("");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = getNetworkConnection();
    const update = () => setAutomaticMotionDisabled(media.matches || isConstrainedConnection());
    update();
    media.addEventListener?.("change", update);
    connection?.addEventListener?.("change", update);
    return () => {
      media.removeEventListener?.("change", update);
      connection?.removeEventListener?.("change", update);
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2 || automaticMotionDisabled || isPaused) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [automaticMotionDisabled, isPaused]);

  useEffect(() => {
    if (automaticMotionDisabled || loadedIndex !== index || !activeCurrentSrc || slides.length < 2) return;
    const connection = getNetworkConnection();
    const count = connection?.effectiveType === "3g" ? 1 : 2;
    const match = activeCurrentSrc.match(/-(\d+)\.(avif|webp)(?:\?.*)?$/i);
    const preferredWidth = match ? Number(match[1]) : 1280;
    const formatName = match?.[2]?.toLowerCase() === "avif" ? "avif" : "webp";

    for (let offset = 1; offset <= count; offset += 1) {
      const nextSlide = slides[(index + offset) % slides.length];
      const format = nextSlide[formatName];
      const image = new window.Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      image.src = closestVariant(format, preferredWidth).src;
    }
  }, [automaticMotionDisabled, loadedIndex, index, activeCurrentSrc]);

  if (!slides.length) return null;
  const slide = slides[index] ?? slides[0];

  return (
    <div className="home-hero__media">
      <figure
        className="home-hero__art home-hero__art--logo home-hero__carousel"
        aria-roledescription="carousel"
        aria-label="Epe photo gallery"
      >
        <div className="home-hero__carousel-stage" aria-live="off">
          <picture>
            <source type="image/avif" srcSet={responsiveSrcSet(slide.avif)} sizes={IMAGE_SIZES} />
            <img
              key={slide.slug}
              src={slide.fallbackSrc}
              srcSet={responsiveSrcSet(slide.webp)}
              sizes={IMAGE_SIZES}
              alt={slide.alt}
              width={slide.width}
              height={slide.height}
              fetchPriority={index === 0 ? "high" : "auto"}
              loading="eager"
              decoding="async"
              onLoad={(event) => {
                setActiveCurrentSrc(event.currentTarget.currentSrc);
                setLoadedIndex(index);
              }}
            />
          </picture>
        </div>
        {!automaticMotionDisabled ? (
          <button
            className="home-hero__carousel-pause"
            type="button"
            aria-label={isPaused ? "Resume photo rotation" : "Pause photo rotation"}
            aria-pressed={isPaused}
            onClick={() => setIsPaused((paused) => !paused)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {isPaused ? <path d="m8 5 11 7-11 7V5Z" /> : <><path d="M8 5h3v14H8z" /><path d="M15 5h3v14h-3z" /></>}
            </svg>
          </button>
        ) : null}
      </figure>
      <div className="home-hero__details">
        <p className="home-hero__location">
          <span className="home-hero__location-mark"><MapPinIcon size={18} /></span>
          <span>Epe · Lagos State</span>
        </p>
        <div className="home-hero__caption" aria-live="off" aria-atomic="true">
          <p key={slide.slug} className="home-hero__slide-label">{slide.label}</p>
          <small className="home-hero__photo-credit">
            Photo by {slide.author} · {slide.license} · <a href={slide.source}>Source</a> · <a href={slide.licenseUrl}>License</a>
          </small>
        </div>
      </div>
    </div>
  );
}
