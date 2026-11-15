export const NEWS_LAYOUTS: readonly ["editorial-rail", "magazine-sections", "reader-focused", "compact-topical"];
export const DEFAULT_NEWS_LAYOUT: "editorial-rail";
export function selectNewsLayout(minuteBucket: number): (typeof NEWS_LAYOUTS)[number];
export function currentNewsLayout(now?: Date): (typeof NEWS_LAYOUTS)[number];
