export const DASHBOARD_TABS = ["home", "discover", "notifications", "saved", "profile"] as const;
export type DashboardTab = typeof DASHBOARD_TABS[number];
export function swipeDestination(active: DashboardTab, dx: number, dy: number): DashboardTab | null {
  if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  const next = DASHBOARD_TABS.indexOf(active) + (dx < 0 ? 1 : -1);
  return DASHBOARD_TABS[next] ?? null;
}
