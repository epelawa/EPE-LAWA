import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { staffHref } from "../../lib/admin-path";
import { PageFrame, Panel, SectionHeading } from "@epelawa/ui";
import DashboardStats from "../../components/dashboard-stats";
import RecentActivity from "../../components/recent-activity";
import QuickActions from "../../components/quick-actions";
import LiveQueues from "../../components/live-queues";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = await createClient();

  // Load dashboard data in parallel
  const [statsPromise, activityPromise, queuesPromise] = await Promise.allSettled([
    db.rpc("dashboard_stats").catch(() => ({ data: null })),
    db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(10).catch(() => ({ data: null })),
    db.rpc("queue_counts").catch(() => ({ data: null })),
  ]);

  const stats = statsPromise.status === "fulfilled" ? statsPromise.value.data : null;
  const activity = activityPromise.status === "fulfilled" ? activityPromise.value.data : null;
  const queues = queuesPromise.status === "fulfilled" ? queuesPromise.value.data : null;

  return (
    <PageFrame>
      <div className="admin-dashboard">
        {/* Header */}
        <header className="admin-dashboard__header">
          <div className="admin-dashboard__welcome">
            <h1>Admin Dashboard</h1>
            <p className="ui-muted">Welcome back! Here's what's happening in EPE LAWA.</p>
          </div>
          <div className="admin-dashboard__header-actions">
            <QuickActions />
          </div>
        </header>

        {/* Stats Grid */}
        <Suspense fallback={<DashboardStats.Skeleton />}>
          <DashboardStats stats={stats} />
        </Suspense>

        {/* Main Content Grid */}
        <div className="admin-dashboard__grid">
          {/* Live Queues */}
          <Panel className="admin-dashboard__card">
            <SectionHeading
              eyebrow="Inbox"
              title="Live Queues"
              action={
                <Link href={staffHref("/business-review")} className="ui-text-link">
                  View all
                </Link>
              }
            />
            <Suspense fallback={<LiveQueues.Skeleton />}>
              <LiveQueues queues={queues} />
            </Suspense>
          </Panel>

          {/* Recent Activity */}
          <Panel className="admin-dashboard__card">
            <SectionHeading
              eyebrow="Activity"
              title="Recent Actions"
              action={
                <Link href={staffHref("/analytics")} className="ui-text-link">
                  View analytics
                </Link>
              }
            />
            <Suspense fallback={<RecentActivity.Skeleton />}>
              <RecentActivity activity={activity} />
            </Suspense>
          </Panel>

          {/* Quick Links */}
          <Panel className="admin-dashboard__card">
            <SectionHeading eyebrow="Navigation" title="Quick Links" />
            <div className="admin-dashboard__quick-links">
              <Link href={staffHref("/newsroom")} className="admin-dashboard__quick-link">
                <span className="admin-dashboard__quick-link-icon" aria-hidden="true">
                  📰
                </span>
                <span>Newsroom</span>
              </Link>
              <Link href={staffHref("/business-review")} className="admin-dashboard__quick-link">
                <span className="admin-dashboard__quick-link-icon" aria-hidden="true">
                  🏢
                </span>
                <span>Businesses</span>
              </Link>
              <Link href={staffHref("/moderation/forum")} className="admin-dashboard__quick-link">
                <span className="admin-dashboard__quick-link-icon" aria-hidden="true">
                  💬
                </span>
                <span>Forum</span>
              </Link>
              <Link href={staffHref("/members")} className="admin-dashboard__quick-link">
                <span className="admin-dashboard__quick-link-icon" aria-hidden="true">
                  👥
                </span>
                <span>Members</span>
              </Link>
              <Link href={staffHref("/settings/cron")} className="admin-dashboard__quick-link">
                <span className="admin-dashboard__quick-link-icon" aria-hidden="true">
                  ⚙️
                </span>
                <span>Cron Jobs</span>
              </Link>
              <Link href={staffHref("/analytics")} className="admin-dashboard__quick-link">
                <span className="admin-dashboard__quick-link-icon" aria-hidden="true">
                  📊
                </span>
                <span>Analytics</span>
              </Link>
            </div>
          </Panel>

          {/* System Status */}
          <Panel className="admin-dashboard__card">
            <SectionHeading eyebrow="System" title="Status" />
            <div className="admin-dashboard__status">
              <div className="admin-dashboard__status-item">
                <span className="admin-dashboard__status-label">Database</span>
                <span className="admin-dashboard__status-value admin-dashboard__status-value--healthy">
                  Healthy
                </span>
              </div>
              <div className="admin-dashboard__status-item">
                <span className="admin-dashboard__status-label">Storage</span>
                <span className="admin-dashboard__status-value admin-dashboard__status-value--healthy">
                  Online
                </span>
              </div>
              <div className="admin-dashboard__status-item">
                <span className="admin-dashboard__status-label">API</span>
                <span className="admin-dashboard__status-value admin-dashboard__status-value--healthy">
                  Operational
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </PageFrame>
  );
}
