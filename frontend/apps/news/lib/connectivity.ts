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

export function isPullRefreshEnabled(pathname: string | null): boolean {
  return pathname !== null && pathname.startsWith("/") && pathname !== "/";
}
