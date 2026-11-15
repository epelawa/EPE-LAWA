export type DashboardMetricState = {
  value: number | null;
  status: "verified" | "restricted" | "unavailable";
};

type CountResult = { count: number | null; error: { code?: string } | null };

export function combineCapabilityStates(...states: (boolean | null)[]): boolean | null {
  if (states.includes(true)) return true;
  if (states.length > 0 && states.every((state) => state === false)) return false;
  return null;
}

export function resolveDashboardMetric(
  result: CountResult | null,
  allowed: boolean | null,
): DashboardMetricState {
  if (allowed === false) return { value: null, status: "restricted" };
  if (
    allowed !== true || !result || result.error || typeof result.count !== "number" ||
    !Number.isSafeInteger(result.count) || result.count < 0
  ) {
    return { value: null, status: "unavailable" };
  }
  return { value: result.count, status: "verified" };
}
