import type { Metadata } from "next";

/** Shared Open Graph image. 1200×630, the size the file in `public/` actually is. */
const shareImage = {
  url: "/share.png",
  width: 1200,
  height: 630,
  alt: "EPE LAWA — The Voice of Epe Division",
};

const siteName = "EPE LAWA";

/**
 * Per-page metadata. Canonical and Open Graph URLs stay relative here and are resolved
 * against `metadataBase` in the root layout, so the domain is decided in one place.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: `/${string}`;
}): Metadata {
  const socialTitle = `${title} | ${siteName}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName,
      title: socialTitle,
      description,
      url: path,
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [shareImage.url],
    },
  };
}
