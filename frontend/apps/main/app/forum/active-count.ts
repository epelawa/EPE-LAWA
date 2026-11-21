type ThreadRows = { last_activity_at?: string | null }[];

export function countActive(threads: ThreadRows, windowMs = 15 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  return threads.filter(thread => thread.last_activity_at && Date.parse(thread.last_activity_at) > cutoff).length;
}
