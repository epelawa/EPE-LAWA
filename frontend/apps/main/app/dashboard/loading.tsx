import styles from "./dashboard.module.css";

export default function DashboardLoading() {
  return <main className={`${styles.shell} member-dashboard-shell`} aria-busy="true">
    <p className="sr-only" role="status">Loading your dashboard and published stories.</p>
    <div className={styles.loadingTabs} aria-hidden="true"><span /><span /><span /><span /><span /></div>
    <div className={styles.loadingHero} aria-hidden="true"><span /><span /><span /></div>
    <div className={styles.loadingCard} aria-hidden="true"><span /><span /><span /><span /></div>
  </main>;
}
