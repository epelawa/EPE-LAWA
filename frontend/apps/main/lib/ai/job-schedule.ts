/**
 * When each AI job (other than the news desk, which has its own schedule)
 * runs on autopilot. Pure, so the rules are unit-tested.
 *
 * - "pass": every autopilot pass (every 5 minutes), whenever there is work;
 * - "interval": every N minutes (5 minutes to 7 days);
 * - "times": once at each set Lagos time, every day;
 * - "off": never by itself — "Run now" still works.
 */
import { cleanNewsTimes, latestNewsSlot } from "./news-schedule";

export const SCHEDULED_JOBS = [
  { key: "moderation", label: "Comment moderation" },
  { key: "enquiries", label: "Enquiry replies" },
  { key: "support", label: "Support tickets" },
  { key: "businesses", label: "Business verification" },
  { key: "admin_logs", label: "Admin log explanations" },
  { key: "ads", label: "Ad placement" },
] as const;
export type ScheduledJob = (typeof SCHEDULED_JOBS)[number]["key"];

export type JobSchedule = { mode: "pass" | "interval" | "times" | "off"; minutes: number; times: string[] };
export const JOB_INTERVAL_LIMITS = { min: 5, max: 10_080 } as const;

export const DEFAULT_JOB_SCHEDULES: Record<ScheduledJob, JobSchedule> = {
  moderation: { mode: "pass", minutes: 5, times: [] },
  enquiries: { mode: "pass", minutes: 5, times: [] },
  support: { mode: "pass", minutes: 5, times: [] },
  businesses: { mode: "pass", minutes: 5, times: [] },
  admin_logs: { mode: "interval", minutes: 60, times: [] },
  ads: { mode: "interval", minutes: 1440, times: [] },
};

function one(raw: unknown, fallback: JobSchedule): JobSchedule {
  const row = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  if (!row) return fallback;
  const mode = row.mode === "pass" || row.mode === "interval" || row.mode === "times" || row.mode === "off" ? row.mode : fallback.mode;
  const minutes = Number(row.minutes);
  const times = Array.isArray(row.times) ? cleanNewsTimes(row.times) : [];
  const schedule: JobSchedule = {
    mode,
    minutes: Number.isInteger(minutes) && minutes >= JOB_INTERVAL_LIMITS.min && minutes <= JOB_INTERVAL_LIMITS.max ? minutes : fallback.minutes,
    times,
  };
  if (schedule.mode === "times" && !schedule.times.length) return { ...schedule, mode: "interval" };
  return schedule;
}

export function normaliseJobSchedules(raw: unknown): Record<ScheduledJob, JobSchedule> {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(SCHEDULED_JOBS.map(({ key }) => [key, one(source[key], DEFAULT_JOB_SCHEDULES[key])])) as Record<ScheduledJob, JobSchedule>;
}

export function normaliseLastDue(raw: unknown): Partial<Record<ScheduledJob, string>> {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const result: Partial<Record<ScheduledJob, string>> = {};
  for (const { key } of SCHEDULED_JOBS) {
    const value = source[key];
    if (typeof value === "string" && Number.isFinite(Date.parse(value))) result[key] = value;
  }
  return result;
}

/** Whether the job's schedule says it should be checked at this pass. */
export function jobDue(schedule: JobSchedule, last: string | null | undefined, now: number): boolean {
  if (schedule.mode === "off") return false;
  if (schedule.mode === "pass") return true;
  const previous = last ? Date.parse(last) : Number.NaN;
  if (schedule.mode === "times") {
    const slot = latestNewsSlot(schedule.times, now);
    return slot !== null && (!Number.isFinite(previous) || previous < slot);
  }
  // A 2-minute grace keeps a 5-minute cron from slipping a whole tick.
  return !Number.isFinite(previous) || now - previous >= (Math.max(JOB_INTERVAL_LIMITS.min, schedule.minutes) - 2) * 60_000;
}

export function intervalLabel(minutes: number): string {
  if (minutes % 1440 === 0) return minutes === 1440 ? "every day" : `every ${minutes / 1440} days`;
  if (minutes % 60 === 0) return minutes === 60 ? "every hour" : `every ${minutes / 60} hours`;
  return `every ${minutes} minutes`;
}

export function describeJobSchedule(schedule: JobSchedule, to12h: (value: string) => string): string {
  if (schedule.mode === "off") return "Off — runs only when you press Run now";
  if (schedule.mode === "pass") return "Every 5 minutes, whenever there is work";
  if (schedule.mode === "times") return `Daily at ${schedule.times.map(to12h).join(", ")} (Lagos)`;
  return `Runs ${intervalLabel(schedule.minutes)}`;
}
