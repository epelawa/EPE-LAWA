/** The client-provided flyer says Thursday 1:30pm; Lagos uses UTC+1 year-round. */
export function radioReminderKey(now: Date): string | null {
  const lagos = new Date(now.getTime() + 60 * 60 * 1000);
  if (lagos.getUTCDay() !== 4 || lagos.getUTCHours() !== 13 || lagos.getUTCMinutes() < 30 || lagos.getUTCMinutes() >= 35) return null;
  return lagos.toISOString().slice(0, 10);
}
