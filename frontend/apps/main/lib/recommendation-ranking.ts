/** View totals are daily deduplicated counts accumulated across all recorded days.
 * Rank only the provided recent candidates; missing metrics are not zero. */
export function rankRecentStories<T extends { id: string }>(
  stories: T[], views: ReadonlyMap<string, { view_count: number }>, limit = 4,
): { items: T[]; ranked: boolean } {
  if (!stories.length) return { items: [], ranked: false };
  const complete = stories.every(story => {
    const value = views.get(story.id)?.view_count;
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
  });
  if (!complete) return { items: stories.slice(0, limit), ranked: false };
  // Stable sort retains the existing newest-first, slug-tiebroken input for ties.
  return { items: [...stories].sort((a, b) => views.get(b.id)!.view_count - views.get(a.id)!.view_count).slice(0, limit), ranked: true };
}
