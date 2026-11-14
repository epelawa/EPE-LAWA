export const NEWS_LAYOUTS: readonly ["editorial-rail", "magazine-sections", "breaking-ranked", "reader-saved", "compact-topical"];
export function lagosCalendarDate(instant?: Date): string;
export function selectNewsLayout(lagosDate: string): (typeof NEWS_LAYOUTS)[number];
export function currentNewsLayout(now?: Date): (typeof NEWS_LAYOUTS)[number];
