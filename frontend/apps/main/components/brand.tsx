"use client";

import { useState } from "react";

/**
 * The EPE LAWA lockup.
 *
 * The only brand mark in this project is the supplied artwork at
 * `public/brand-logo.png`. An earlier version drew a fallback mark inline (a
 * teal circle with a wave) which was invented branding — it has been removed.
 *
 * The PNG is dark artwork on a transparent background, so it sits on an ivory
 * chip: without it the mark disappears in dark mode. Its native size is
 * 1348×1167, so the width is derived from the height instead of being forced
 * into a square.
 *
 * If the file fails to load, the wordmark text below is the honest fallback.
 * Nothing is hidden with `display: none`.
 */

const LOGO_WIDTH = 1348;
const LOGO_HEIGHT = 1167;

export function BrandLockup({ size = 32 }: { size?: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  const markWidth = Math.round((size * LOGO_WIDTH) / LOGO_HEIGHT);

  return (
    <span className="brand">
      {imageFailed ? null : (
        <span className="brand__mark">
          <img
            src="/brand-logo.png"
            alt=""
            width={markWidth}
            height={size}
            style={{ width: markWidth, height: size }}
            decoding="async"
            aria-hidden="true"
            onError={() => setImageFailed(true)}
          />
        </span>
      )}

      <span className="brand__word">
        <span className="brand__name">EPE LAWA</span>
        <span className="brand__place">Epe Division</span>
      </span>
    </span>
  );
}
