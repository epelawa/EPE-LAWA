"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, ArrowUpRightIcon } from "./icons";

export type HeroSlide = {
  src: string;
  alt: string;
  label: string;
  credit?: string;
  width: number;
  height: number;
};

/**
 * Keep this list to owner-approved, licensed/credited imagery only.
 * The UI intentionally supports at most ten slides; the current release has
 * one approved asset until more Epe imagery is supplied with its credits.
 */
export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    src: "/brand-logo.png",
    alt: "EPE LAWA official logo",
    label: "Our place. Our identity.",
    width: 1348,
    height: 1167,
  },
];

const MAX_HERO_SLIDES = 10;

function isConstrainedConnection() {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  return Boolean(connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g");
}

export default function HeroCarousel() {
  const slides = HERO_SLIDES.slice(0, MAX_HERO_SLIDES);
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches || isConstrainedConnection());
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [reducedMotion, slides.length]);

  if (!slides.length) return null;
  const slide = slides[index] ?? slides[0];
  const move = (delta: number) => setIndex((current) => (current + delta + slides.length) % slides.length);

  return (
    <figure
      className="home-hero__art home-hero__art--logo home-hero__carousel"
      aria-roledescription="carousel"
      aria-label="EPE LAWA hero imagery"
      onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null || slides.length < 2) return;
        const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
        if (Math.abs(distance) > 48) move(distance < 0 ? 1 : -1);
        touchStart.current = null;
      }}
      onKeyDown={(event) => {
        if (slides.length < 2) return;
        if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
        if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      }}
      tabIndex={slides.length > 1 ? 0 : undefined}
    >
      <div className="home-hero__carousel-stage" aria-live={reducedMotion ? "polite" : "off"}>
        <img src={slide.src} alt={slide.alt} width={slide.width} height={slide.height} fetchPriority={index === 0 ? "high" : "auto"} loading={index === 0 ? "eager" : "lazy"} />
      </div>
      <figcaption>
        <span><strong>{slide.label}</strong>{slide.credit ? <small>{slide.credit}</small> : null}</span>
        <ArrowUpRightIcon size={20} aria-hidden="true" />
      </figcaption>
      {slides.length > 1 ? <>
        <div className="home-hero__carousel-controls">
          <button type="button" className="home-hero__carousel-control" onClick={() => move(-1)} aria-label="Previous hero image"><ArrowRightIcon size={18} className="rotate-180" aria-hidden="true" /></button>
          <span aria-live="polite" className="sr-only">Slide {index + 1} of {slides.length}: {slide.label}</span>
          <button type="button" className="home-hero__carousel-control" onClick={() => move(1)} aria-label="Next hero image"><ArrowRightIcon size={18} aria-hidden="true" /></button>
        </div>
        <div className="home-hero__carousel-dots" role="tablist" aria-label="Choose hero image">
          {slides.map((item, itemIndex) => <button key={item.src} type="button" role="tab" aria-selected={itemIndex === index} aria-label={`Show hero image ${itemIndex + 1}: ${item.label}`} className={itemIndex === index ? "is-active" : ""} onClick={() => setIndex(itemIndex)} />)}
        </div>
      </> : null}
    </figure>
  );
}
