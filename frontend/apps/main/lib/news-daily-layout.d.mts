export const NEWS_LAYOUTS: readonly ["editorial-rail", "magazine-sections", "breaking-ranked", "reader-focused", "compact-topical"];
export function selectNewsLayout(minuteBucket: number): (typeof NEWS_LAYOUTS)[number];
export function currentNewsLayout(now?: Date): (typeof NEWS_LAYOUTS)[number];
