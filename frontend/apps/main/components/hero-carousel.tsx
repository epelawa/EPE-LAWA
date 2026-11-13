"use client";

import { useEffect, useState } from "react";

export type HeroSlide = {
  src: string;
  alt: string;
  label: string;
  credit?: string;
  width: number;
  height: number;
};

/** Keep this list to locally stored, licensed/credited Epe imagery only. */
export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    src: "/hero/01-epe-epe-jpg.jpg",
    alt: "Epe landmark sign with fish sculpture",
    label: "Our place. Our identity.",
    credit: "Topsescode · CC BY-SA 4.0 · Wikimedia Commons",
    width: 1600,
    height: 1600,
  },
  {
    src: "/hero/02-epe-epe-town-jpg.jpg",
    alt: "Street scene in Epe town",
    label: "The town in motion.",
    credit: "Rae frank1 · CC BY-SA 4.0 · Wikimedia Commons",
    width: 1600,
    height: 1200,
  },
  {
    src: "/hero/03-epe-fish-monoment-in-epe-lagos-nigeria-3-jpg.jpg",
    alt: "Fish monument in Epe, Lagos",
    label: "A symbol of Epe.",
    credit: "Koutchika Lihouenou Gaspard · CC BY-SA 4.0 · Wikimedia Commons",
    width: 1600,
    height: 1067,
  },
  {
    src: "/hero/04-epe-iberekodo-beach-epe-lagos-jpg.jpg",
    alt: "Iberekodo Beach in Epe, Lagos",
    label: "Along the water.",
    credit: "Tarikhaldun · CC BY-SA 4.0 · Wikimedia Commons",
    width: 1600,
    height: 899,
  },
  {
    src: "/hero/05-epe-aiyetoro-market-at-epe-jpg.jpg",
    alt: "Aiyetoro market at Epe",
    label: "Markets and livelihoods.",
    credit: "Joseph Sly1015 · CC BY-SA 4.0 · Wikimedia Commons",
    width: 1600,
    height: 2133,
  },
  {
    src: "/hero/06-epe-an-onions-display-at-ayetoro-epe-market-jpg.jpg",
    alt: "Onions display at Ayetoro-Epe market",
    label: "Everyday enterprise.",
    credit: "Edriiic · CC BY-SA 4.0 · Wikimedia Commons",
    width: 1600,
    height: 2133,
  },
  {
    src: "/hero/07-epe-boy-building-a-canoe-jpg.jpg",
    alt: "Canoe building in Epe",
    label: "Knowledge carried forward.",
    credit: "Oluphisayo · CC BY-SA 4.0 · Wikimedia Commons",
    width: 1600,
    height: 900,
  },
  {
    src: "/hero/08-epe-a-woman-cutting-fish-jpg.jpg",
    alt: "A woman preparing fish in Epe",
    label: "Work by the water.",
    credit: "Keyz abdulsalaam · CC0 · Wikimedia Commons",
    width: 1600,
    height: 2133,
  },
  {
    src: "/hero/09-epe-adesowon-junior-and-senior-grammar-school-ilara-epe-jpg.jpg",
    alt: "Adesowon Junior and Senior Grammar School in Ilara-Epe",
    label: "Learning in the division.",
    credit: "Addjimedu · CC0 · Wikimedia Commons",
    width: 1600,
    height: 696,
  },
  {
    src: "/hero/10-epe-augustine-university-ilara-epe-entrance-jpg.jpg",
    alt: "Augustine University Ilara-Epe entrance",
    label: "A future being built.",
    credit: "Ourlibrary · CC0 · Wikimedia Commons",
    width: 1600,
    height: 1200,
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

  return (
    <figure
      className="home-hero__art home-hero__art--logo home-hero__carousel"
      aria-roledescription="carousel"
      aria-label="EPE LAWA hero imagery"
    >
      <div className="home-hero__carousel-stage" aria-live={reducedMotion ? "polite" : "off"}>
        <img key={slide.src} src={slide.src} alt={slide.alt} width={slide.width} height={slide.height} fetchPriority={index === 0 ? "high" : "auto"} loading={index === 0 ? "eager" : "lazy"} />
      </div>
    </figure>
  );
}
