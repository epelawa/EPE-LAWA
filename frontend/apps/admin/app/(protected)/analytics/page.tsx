import Link from "../../../components/admin-link";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading } from "@epelawa/ui";
import { adminHref } from "../../../lib/admin-path";
import { createStaffClient } from "../../../lib/supabase";
import TrendChart from "./trend-chart";

export const dynamic = "force-dynamic";

type TimeseriesRow = { day: string; metric: string; total: number };
type TopArticleRow = { article_id: string; slug: string; title: string; view_count: number };

const metricLabel: Record<string, string> = {
  article_views: "Story reads",
  business_clicks: "Business contact clicks",
  new_members: "New member profiles",
  forum_threads: "New forum threads",
  forum_posts: "Forum messages",
  event_submissions: "Event submissions",
  radio_song_requests: "Radio song requests",
};

function dayRange(days: number) {
  const out: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    out.push(date.toISOString().slice(0, 10));
  }
  return out;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const query = await searchParams;
  const requestedDays = Number.parseInt(typeof query.days === "string" ? query.days : "", 10);
  const days = requestedDays === 7 || requestedDays === 90 ? requestedDays : 30;
  const db = await createStaffClient();
  const [publish, business, moderation] = await Promise.all([
    db.rpc("has_capability", { p_capability: "article.publish" }),
    db.rpc("has_capability", { p_capability: "business.review" }),
    db.rpc("has_capability", { p_capability: "moderation.review" }),
  ]);
  const allowed = publish.data === true || business.data === true || moderation.data === true;
  if (!allowed) {
    return <PageFrame className="ui-stack">
      <PageIntro eyebrow="Insight · Staff" title="Analytics" description="Trends from the site's own counters." />
      <Notice tone="danger" role="alert">A staff review capability is required to view analytics.</Notice>
    </PageFrame>;
  }

  const [timeseriesResult, engagementResult, topResult] = await Promise.all([
    db.rpc("staff_analytics_timeseries", { p_days: days }),
    db.rpc("staff_analytics_engagement", { p_days: days }),
    db.rpc("staff_analytics_top_articles", { p_days: days, p_limit: 10 }),
  ]);

  if (timeseriesResult.error || engagementResult.error || topResult.error) {
    return <PageFrame className="ui-stack">
      <PageIntro eyebrow="Insight · Staff" title="Analytics" description={`Trends across the last ${days} days.`} />
      <EmptyPanel title="Analytics unavailable" description="Counters could not be aggregated. Try again later." />
    </PageFrame>;
  }

  const rows = (timeseriesResult.data ?? []) as unknown as TimeseriesRow[];
  const engagementRows = (engagementResult.data ?? []) as unknown as TimeseriesRow[];
  const wantedDays = dayRange(days);
  const seriesFor = (metric: string, source: TimeseriesRow[] = rows) =>
    wantedDays.map((day) => ({ day, total: source.find((row) => row.metric === metric && row.day === day)?.total ?? 0 }));
  const topArticles = ((topResult.data ?? []) as unknown as TopArticleRow[]).slice(0, 10);

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Insight · Staff" title="Analytics" description={`Trends across the last ${days} days, aggregated from the site's own counters. No personal data is shown.`} />
    <div className="ui-row">
      {[
        { label: "Last 7 days", days: 7 },
        { label: "Last 30 days", days: 30 },
        { label: "Last 90 days", days: 90 },
      ].map((option) => <Link key={option.days} className={option.days === days ? "btn-primary" : "btn-secondary"} href={adminHref(`/analytics?days=${option.days}`)}>{option.label}</Link>)}
    </div>

    <section className="ui-stack-sm">
      <SectionHeading eyebrow="Trends" title="Daily activity" description="Counts are aggregated in the database; nothing here identifies an individual reader." />
      <div className="ui-stack-sm">
        {["article_views", "business_clicks", "new_members"].map((metric) => (
          <Panel key={metric} className="ui-stack-sm">
            <TrendChart label={metricLabel[metric] ?? metric} points={seriesFor(metric)} />
          </Panel>
        ))}
      </div>
    </section>

    <section className="ui-stack-sm">
      <SectionHeading eyebrow="Community" title="Community activity" description="What the community contributes each day: forum threads and messages, event submissions and radio song requests. Counts never identify an individual member." />
      <div className="ui-stack-sm">
        {["forum_threads", "forum_posts", "event_submissions", "radio_song_requests"].map((metric) => (
          <Panel key={metric} className="ui-stack-sm">
            <TrendChart label={metricLabel[metric] ?? metric} points={seriesFor(metric, engagementRows)} />
          </Panel>
        ))}
      </div>
    </section>

    <section className="ui-stack-sm">
      <SectionHeading eyebrow="Stories" title={`Most-read stories · ${days} days`} description="Reads counted per unique viewer per day, matching the public counter." />
      {topArticles.length
        ? <ul className="ui-list ui-stack-sm">{topArticles.map((article) => <li key={article.article_id}>
          <Panel className="ui-stack-sm">
            <div className="ui-row">
              <Link href={adminHref(`/newsroom/${article.article_id}`)} className="ui-item-title">{article.title}</Link>
              <span className="ui-meta">{article.view_count} reads</span>
            </div>
            <p className="ui-meta">{article.slug}</p>
          </Panel>
        </li>)}</ul>
        : <EmptyPanel title="No reads recorded yet" description="Once the public site records story reads in this window they appear here, newest counts first." />}
    </section>
  </PageFrame>;
}
