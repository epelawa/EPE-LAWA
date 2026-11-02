/** A browser's online flag is only a hint. A failed probe is not proof of offline. */
export type ConnectionResult = "offline" | "online" | "unreachable";

export async function probeConnection(
  browserOnline: boolean,
  probe: () => Promise<{ ok: boolean }>,
): Promise<ConnectionResult> {
  if (!browserOnline) return "offline";
  try {
    return (await probe()).ok ? "online" : "unreachable";
  } catch {
    return "unreachable";
  }
}

export function isPullRefreshGesture(deltaX: number, deltaY: number): boolean {
  return deltaY >= 80 && deltaY > Math.abs(deltaX) * 1.5;
}
