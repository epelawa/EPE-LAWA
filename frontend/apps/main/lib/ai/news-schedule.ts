/**
 * When the news desk is due, and how many stories it owes. Pure, so the
 * rules the AI follows are unit-tested.
 *
 * - Set times (Lagos, HH:MM): news runs once at each time every day. A time
 *   missed while the AI was off or busy is caught up once, at the next pass.
 * - Otherwise every `news_interval_minutes` (a 2-minute grace keeps a
 *   5-minute cron from slipping a whole tick).
 * - `news_owed`: stories still owed from the last run, written at the next
 *   pass (every 5 minutes) until the chosen "stories per run" is met.
 */

export const LAGOS_OFFSET_MINUTES = 60; // WAT, UTC+1, no daylight saving
export const NEWS_LIMITS = {
  interval: { min: 10, max: 10_080 },
  articles: { min: 1, max: 20 },
  budget: { min: 5, max: 10_000 },
  push: { min: 0, max: 50 },
  times: 24,
} as const;

export type NewsScheduleSettings = {
  news_interval_minutes: number;
  news_times?: string[] | null;
  news_owed?: number | null;
  last_news_run_at: string | null;
};

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function cleanNewsTimes(values: unknown[]): string[] {
  const times = values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().slice(0, 5))
    .filter((value) => TIME.test(value));
  return [...new Set(times)].sort().slice(0, NEWS_LIMITS.times);
}

/** The most recent set time at or before `now`, as an instant (today's or yesterday's). */
export function latestNewsSlot(times: string[], now: number): number | null {
  const clean = cleanNewsTimes(times);
  if (!clean.length) return null;
  const lagosNow = now + LAGOS_OFFSET_MINUTES * 60_000;
  const lagosMidnight = Math.floor(lagosNow / 86_400_000) * 86_400_000 - LAGOS_OFFSET_MINUTES * 60_000;
  let latest: number | null = null;
  for (const time of clean) {
    const [hours, minutes] = time.split(":").map(Number);
    let slot = lagosMidnight + (hours * 60 + minutes) * 60_000;
    if (slot > now) slot -= 86_400_000;
    if (latest === null || slot > latest) latest = slot;
  }
  return latest;
}

/** The next set time after `now` (for the admin page). */
export function nextNewsSlot(times: string[], now: number): number | null {
  const latest = latestNewsSlot(times, now);
  if (latest === null) return null;
  const clean = cleanNewsTimes(times);
  let next: number | null = null;
  for (const offset of [0, 86_400_000]) {
    for (const time of clean) {
      const [hours, minutes] = time.split(":").map(Number);
      const lagosMidnight = Math.floor((now + LAGOS_OFFSET_MINUTES * 60_000) / 86_400_000) * 86_400_000 - LAGOS_OFFSET_MINUTES * 60_000;
      const slot = lagosMidnight + offset + (hours * 60 + minutes) * 60_000;
      if (slot > now && (next === null || slot < next)) next = slot;
    }
  }
  return next;
}

export type NewsDue = { due: false } | { due: true; reason: "schedule" | "owed"; target: "owed" | "per_run" };

export function newsDue(settings: NewsScheduleSettings, now: number): NewsDue {
  const last = settings.last_news_run_at ? Date.parse(settings.last_news_run_at) : Number.NaN;
  const times = cleanNewsTimes(settings.news_times ?? []);
  let scheduled: boolean;
  if (times.length) {
    const slot = latestNewsSlot(times, now);
    scheduled = slot !== null && (!Number.isFinite(last) || last < slot);
  } else {
    const interval = Math.max(NEWS_LIMITS.interval.min, settings.news_interval_minutes);
    scheduled = !Number.isFinite(last) || now - last >= (interval - 2) * 60_000;
  }
  if (scheduled) return { due: true, reason: "schedule", target: "per_run" };
  if ((settings.news_owed ?? 0) > 0) return { due: true, reason: "owed", target: "owed" };
  return { due: false };
}

/**
 * Stories still owed after a run. Only a run cut short by its time limit owes
 * the rest; running out of fresh stories or of the daily request budget does not.
 */
export function storiesOwed(target: number, written: number, stoppedForTime: boolean): number {
  if (!stoppedForTime) return 0;
  return Math.max(0, Math.min(NEWS_LIMITS.articles.max, target - written));
}
