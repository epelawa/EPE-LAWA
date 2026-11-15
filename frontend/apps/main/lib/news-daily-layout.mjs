export const NEWS_LAYOUTS = Object.freeze([
  "editorial-rail",
  "magazine-sections",
  "reader-focused",
  "compact-topical",
]);

export const DEFAULT_NEWS_LAYOUT = NEWS_LAYOUTS[0];

/** Pure deterministic selector: each minute offset maps to one allowed layout. */
export function selectNewsLayout(minuteBucket) {
  if (!Number.isSafeInteger(minuteBucket)) throw new TypeError("Expected an integer minute bucket");
  return NEWS_LAYOUTS[((minuteBucket % NEWS_LAYOUTS.length) + NEWS_LAYOUTS.length) % NEWS_LAYOUTS.length];
}

export function currentNewsLayout(now = new Date()) {
  return selectNewsLayout(Math.floor(now.getTime() / 60_000));
}
