/**
 * Connection measurement.
 *
 * A browser's `navigator.onLine` flag is only a hint: it says "there is a
 * network interface", not "the server answered". So the app proves reachability
 * with a real request and never claims a connection it did not measure.
 *
 * Four outcomes, deliberately distinct:
 *   online        the server answered with something below 500
 *   offline       the browser says there is no network, or the request never
 *                 completed (a rejected fetch on the same origin)
 *   unavailable   the server answered with 5xx — it is up and failing
 *   inconclusive  we gave up waiting, so we do not know
 *
 * `inconclusive` exists so the UI can stay silent instead of guessing.
 */

export type ConnectionState = "online" | "offline" | "unavailable" | "inconclusive";

/** Past this, the request is slow enough to tell the user it is slow. */
export const SLOW_THRESHOLD_MS = 2500;

/** A probe that has not settled by now is abandoned rather than left hanging. */
export const PROBE_TIMEOUT_MS = 8000;

/** How long "Back online." stays before it dismisses itself. */
export const RESTORED_DISMISS_MS = 4000;

export type ProbeOptions = {
  slowMs?: number;
  timeoutMs?: number;
  /** Called once, while the probe is still in flight, when it crosses slowMs. */
  onSlow?: () => void;
};

/**
 * A response that resolves at all proves the server is reachable, so a 4xx is
 * "online" — a 404 from a status endpoint is not an outage. Only 5xx means the
 * server is answering but failing.
 */
export async function probeConnection(
  browserOnline: boolean,
  probe: (signal: AbortSignal) => Promise<{ ok: boolean; status?: number }>,
  options: ProbeOptions = {},
): Promise<ConnectionState> {
  if (!browserOnline) return "offline";

  const slowMs = options.slowMs ?? SLOW_THRESHOLD_MS;
  const timeoutMs = options.timeoutMs ?? PROBE_TIMEOUT_MS;
  const controller = new AbortController();

  let slowTimer: ReturnType<typeof setTimeout> | undefined;
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

  if (options.onSlow) {
    slowTimer = setTimeout(() => options.onSlow?.(), slowMs);
  }

  const run = async (): Promise<ConnectionState> => {
    try {
      const response = await probe(controller.signal);
      if (typeof response.status === "number" && response.status >= 500) {
        return "unavailable";
      }
      return "online";
    } catch {
      return controller.signal.aborted ? "inconclusive" : "offline";
    }
  };

  const timeout = new Promise<ConnectionState>((resolve) => {
    timeoutTimer = setTimeout(() => {
      controller.abort();
      resolve("inconclusive");
    }, timeoutMs);
  });

  try {
    return await Promise.race([run(), timeout]);
  } finally {
    if (slowTimer !== undefined) clearTimeout(slowTimer);
    if (timeoutTimer !== undefined) clearTimeout(timeoutTimer);
  }
}

/**
 * Exponential backoff with a cap and ±20% jitter, so a hundred tabs that lost
 * the server do not all retry on the same millisecond.
 *
 * 4s, 8s, 16s, 32s, 60s, 60s…
 */
export function nextProbeDelay(attempt: number, random: () => number = Math.random): number {
  const base = 4000;
  const cap = 60000;
  const step = Math.max(0, Math.floor(attempt));
  const raw = Math.min(cap, base * 2 ** step);
  const jittered = raw * (0.8 + random() * 0.4);
  return Math.round(Math.min(cap, jittered));
}

export function isPullRefreshGesture(deltaX: number, deltaY: number): boolean {
  return deltaY >= 80 && deltaY > Math.abs(deltaX) * 1.5;
}

/** The owner removed the custom gesture from the landing page only. */
export function isPullRefreshEnabled(pathname: string | null): boolean {
  return pathname !== null && pathname.startsWith("/") && pathname !== "/";
}
