import Link from "next/link";
import { staffHref } from "../lib/admin-path";

export type ActivityItem = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_email: string;
  created_at: string;
  details?: any;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

function getActionIcon(action: string): string {
  switch (action.toLowerCase()) {
    case "create":
    case "created":
      return "➕";
    case "update":
    case "updated":
      return "✏️";
    case "delete":
    case "deleted":
      return "🗑️";
    case "publish":
    case "published":
      return "📢";
    case "approve":
    case "approved":
      return "✅";
    case "reject":
    case "rejected":
      return "❌";
    default:
      return "🔄";
  }
}

function ActivityItem({ item }: { item: ActivityItem }) {
  const entityPath = getEntityPath(item.entity_type, item.entity_id);

  return (
    <li className="admin-recent-activity__item">
      <span className="admin-recent-activity__icon" aria-hidden="true">
        {getActionIcon(item.action)}
      </span>
      <div className="admin-recent-activity__content">
        <span className="admin-recent-activity__action">
          <strong>{item.user_email}</strong> {item.action.toLowerCase()}
        </span>
        <span className="admin-recent-activity__entity">
          {item.entity_type} {entityPath && <Link href={entityPath}>(view)</Link>}
        </span>
        <span className="admin-recent-activity__time">{formatDate(item.created_at)}</span>
      </div>
    </li>
  );
}

function ActivityItemSkeleton() {
  return (
    <li className="admin-recent-activity__item admin-recent-activity__item--skeleton">
      <span className="admin-recent-activity__icon" aria-hidden="true" />
      <div className="admin-recent-activity__content">
        <span className="admin-recent-activity__action admin-recent-activity__action--skeleton" />
        <span className="admin-recent-activity__entity admin-recent-activity__entity--skeleton" />
        <span className="admin-recent-activity__time admin-recent-activity__time--skeleton" />
      </div>
    </li>
  );
}

function getEntityPath(entityType: string, entityId: string): string | null {
  const paths: Record<string, string> = {
    article: "/newsroom",
    business: "/business-review",
    member: "/members",
    "forum_thread": "/moderation/forum",
    comment: "/moderation/comments",
  };
  return paths[entityType.toLowerCase()] || null;
}

export function RecentActivity({ activity }: { activity: ActivityItem[] | null }) {
  if (!activity || activity.length === 0) {
    return <p className="ui-muted">No recent activity</p>;
  }

  return (
    <ul className="admin-recent-activity">
      {activity.slice(0, 5).map((item) => (
        <ActivityItem key={item.id} item={item} />
      ))}
    </ul>
  );
}

RecentActivity.Skeleton = function RecentActivitySkeleton() {
  return (
    <ul className="admin-recent-activity">
      <ActivityItemSkeleton />
      <ActivityItemSkeleton />
      <ActivityItemSkeleton />
      <ActivityItemSkeleton />
      <ActivityItemSkeleton />
    </ul>
  );
};
