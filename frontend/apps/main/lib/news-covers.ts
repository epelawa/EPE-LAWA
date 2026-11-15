export const NEWS_COVERS = {
  epe_welcome_demobebz: {
    url: "/news-media/Welcome_to_Epe.jpg",
    title: "Welcome to Epe",
    alt: "Welcome-to-Epe sign beside a road; illustrative location image, not a campaign rally photograph.",
    caption: "Illustrative Epe location photo; not the campaign rally.",
    author: "DemoBebz",
    source: "https://commons.wikimedia.org/wiki/File:Welcome_to_Epe.jpg",
    license: "https://creativecommons.org/licenses/by-sa/4.0/deed.en",
    credit: "“Welcome to Epe” by DemoBebz, via Wikimedia Commons, CC BY-SA 4.0. No image edits.",
  },
  epe_road_benbeezy: {
    url: "/news-media/Epe_Express_Road.jpg",
    title: "Epe Express Road",
    alt: "Road through Epe; illustrative location image, not evidence of airport construction.",
    caption: "Illustrative Epe road photo; not evidence of airport construction.",
    author: "Benbeezy",
    source: "https://commons.wikimedia.org/wiki/File:Epe_Express_Road.jpg",
    license: "https://creativecommons.org/licenses/by-sa/4.0/deed.en",
    credit: "“Epe Express Road” by Benbeezy, via Wikimedia Commons, CC BY-SA 4.0. No image edits.",
  },
} as const;
export type NewsCoverKey = keyof typeof NEWS_COVERS;
export function isNewsCoverKey(value: unknown): value is NewsCoverKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(NEWS_COVERS, value);
}
export function selectedNewsCover(value: unknown) {
  return isNewsCoverKey(value) ? NEWS_COVERS[value] : null;
}
