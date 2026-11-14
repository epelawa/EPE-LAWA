export const NEWS_LAYOUTS = Object.freeze([
  "editorial-rail",
  "magazine-sections",
  "breaking-ranked",
  "reader-focused",
  "compact-topical",
]);

/** Pure deterministic selector: each Unix-minute bucket maps to one stable layout. */
export function selectNewsLayout(minuteBucket) {
  if (!Number.isSafeInteger(minuteBucket)) throw new TypeError("Expected an integer minute bucket");
  return NEWS_LAYOUTS[((minuteBucket % NEWS_LAYOUTS.length) + NEWS_LAYOUTS.length) % NEWS_LAYOUTS.length];
}

export function currentNewsLayout(now = new Date()) {
  return selectNewsLayout(Math.floor(now.getTime() / 60_000));
}
