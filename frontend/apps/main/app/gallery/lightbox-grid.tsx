"use client";

import { useCallback, useEffect, useState } from "react";
import BrandedDialog from "../../components/branded-dialog";
import styles from "./gallery.module.css";

export type LightboxPhoto = {
  id: string;
  title: string;
  credit: string | null;
  alt: string;
  url: string;
};

/**
 * Client grid for published gallery photographs. Clicking a photograph opens a
 * branded lightbox dialog with keyboard arrow navigation; readers without
 * JavaScript still see the plain image grid.
 */
export default function GalleryLightboxGrid({ photos }: { photos: LightboxPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const photo = openIndex !== null ? photos[openIndex] : undefined;
  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback((delta: 1 | -1) => {
    setOpenIndex((current) => {
      if (current === null || photos.length === 0) return current;
      return (current + delta + photos.length) % photos.length;
    });
  }, [photos.length]);

  useEffect(() => {
    if (openIndex === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [openIndex, step]);

  return (
    <>
      <ul className={styles.archiveGrid}>
        {photos.map((item, index) => (
          <li key={item.id} className={styles.archivedPhoto}>
            <button
              type="button"
              className={styles.lightboxTrigger}
              onClick={() => setOpenIndex(index)}
              aria-haspopup="dialog"
              aria-label={`Open ${item.title} larger`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.alt} loading="lazy" referrerPolicy="no-referrer" />
            </button>
            <div className={styles.archiveCaption}>
              <strong>{item.title}</strong>
              <span>{item.credit ? `Photograph by ${item.credit}` : "Credit on record"}</span>
            </div>
          </li>
        ))}
      </ul>
      <BrandedDialog open={photo !== undefined} onClose={close} title={photo?.title ?? "Photograph"} description={photo?.credit ? `Photograph by ${photo.credit}` : "Credit on record"}>
        {photo ? (
          <div className={styles.lightboxBody}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={photo.alt} referrerPolicy="no-referrer" className={styles.lightboxImage} />
            <p className="ui-meta">{photo.credit ? `Photograph by ${photo.credit}` : "Credit on record"}</p>
            <div className="ui-actions">
              <button className="btn-secondary" type="button" onClick={() => step(-1)}>Previous</button>
              <button className="btn-secondary" type="button" onClick={() => step(1)}>Next</button>
            </div>
          </div>
        ) : null}
      </BrandedDialog>
    </>
  );
}
