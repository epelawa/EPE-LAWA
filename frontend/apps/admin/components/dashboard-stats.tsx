import Link from "./admin-link";
import { staffHref } from "../lib/admin-path";

export type DashboardStatsData = {
  total_members?: number;
  total_businesses?: number;
  total_articles?: number;
  total_forum_threads?: number;
  pending_submissions?: number;
  pending_comments?: number;
} | null;

type StatsCardProps = {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
  color?: string;
};

function StatsCard({ label, value, icon, href, color = "--ep-primary" }: StatsCardProps) {
  const content = (
    <div className="admin-dashboard-stats__card">
      <div className="admin-dashboard-stats__icon" style={{ background: `var(${color})` }} aria-hidden="true">
        {icon}
      </div>
      <div className="admin-dashboard-stats__content">
        <span className="admin-dashboard-stats__value">{value}</span>
        <span className="admin-dashboard-stats__label">{label}</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={staffHref(href)} className="admin-dashboard-stats__link">
        {content}
      </Link>
    );
  }
  return content;
}

function StatsCardSkeleton() {
  return (
    <div className="admin-dashboard-stats__card admin-dashboard-stats__card--skeleton">
      <div className="admin-dashboard-stats__icon" aria-hidden="true" />
      <div className="admin-dashboard-stats__content">
        <span className="admin-dashboard-stats__value admin-dashboard-stats__value--skeleton" />
        <span className="admin-dashboard-stats__label admin-dashboard-stats__label--skeleton" />
      </div>
    </div>
  );
}

export function DashboardStats({ stats }: { stats: DashboardStatsData }) {
  return (
    <div className="admin-dashboard-stats">
      <StatsCard
        label="Members"
        value={stats?.total_members?.toLocaleString() || "0"}
        icon="👥"
        href="/members"
        color="--ep-color-cobalt"
      />
      <StatsCard
        label="Businesses"
        value={stats?.total_businesses?.toLocaleString() || "0"}
        icon="🏢"
        href="/business-review"
        color="--ep-color-royal-steel"
      />
      <StatsCard
        label="Articles"
        value={stats?.total_articles?.toLocaleString() || "0"}
        icon="📰"
        href="/newsroom"
        color="--ep-color-ice-blue"
      />
      <StatsCard
        label="Forum Threads"
        value={stats?.total_forum_threads?.toLocaleString() || "0"}
        icon="💬"
        href="/moderation/forum"
        color="--ep-color-navy"
      />
      <StatsCard
        label="Pending Submissions"
        value={stats?.pending_submissions?.toLocaleString() || "0"}
        icon="⏳"
        href="/business-review"
        color="--ep-warning"
      />
      <StatsCard
        label="Pending Comments"
        value={stats?.pending_comments?.toLocaleString() || "0"}
        icon="💭"
        href="/moderation/comments"
        color="--ep-danger"
      />
    </div>
  );
}

DashboardStats.Skeleton = function DashboardStatsSkeleton() {
  return (
    <div className="admin-dashboard-stats">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
  );
};
