import Link from "next/link";
import { staffHref } from "../lib/admin-path";

export type QueueCountsData = {
  submissions?: number;
  corrections?: number;
  enquiries?: number;
  events?: number;
  songRequests?: number;
  appeals?: number;
  forumReports?: number;
} | null;

type QueueItemProps = {
  label: string;
  count: number;
  href: string;
  badge?: boolean;
};

function QueueItem({ label, count, href, badge = false }: QueueItemProps) {
  return (
    <Link
      href={staffHref(href)}
      className="admin-live-queues__item"
    >
      <span className="admin-live-queues__label">{label}</span>
      {badge && count > 0 ? (
        <span className="admin-live-queues__badge">{count}</span>
      ) : (
        <span className="admin-live-queues__count">{count}</span>
      )}
    </Link>
  );
}

function QueueItemSkeleton() {
  return (
    <div className="admin-live-queues__item admin-live-queues__item--skeleton">
      <span className="admin-live-queues__label admin-live-queues__label--skeleton" />
      <span className="admin-live-queues__count admin-live-queues__count--skeleton" />
    </div>
  );
}

export function LiveQueues({ queues }: { queues: QueueCountsData }) {
  return (
    <div className="admin-live-queues">
      <QueueItem
        label="Business Submissions"
        count={queues?.submissions || 0}
        href="/business-review"
        badge
      />
      <QueueItem
        label="Corrections"
        count={queues?.corrections || 0}
        href="/corrections"
        badge
      />
      <QueueItem
        label="Enquiries"
        count={queues?.enquiries || 0}
        href="/enquiries"
        badge
      />
      <QueueItem
        label="Events"
        count={queues?.events || 0}
        href="/events"
        badge
      />
      <QueueItem
        label="Song Requests"
        count={queues?.songRequests || 0}
        href="/radio/requests"
        badge
      />
      <QueueItem
        label="Appeals"
        count={queues?.appeals || 0}
        href="/appeals"
        badge
      />
      <QueueItem
        label="Forum Reports"
        count={queues?.forumReports || 0}
        href="/moderation/forum"
        badge
      />
    </div>
  );
}

LiveQueues.Skeleton = function LiveQueuesSkeleton() {
  return (
    <div className="admin-live-queues">
      <QueueItemSkeleton />
      <QueueItemSkeleton />
      <QueueItemSkeleton />
      <QueueItemSkeleton />
      <QueueItemSkeleton />
      <QueueItemSkeleton />
      <QueueItemSkeleton />
    </div>
  );
};
