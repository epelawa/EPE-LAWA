import type { Metadata } from "next";
import Link from "../../../components/admin-link";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { adminHref } from "../../../lib/admin-path";
import { lagosExact, lagosInputValue } from "../../../lib/lagos-time";
import { runAiJobNow, saveAiSettings } from "../../../lib/ai-actions";
import { AI_CAPABILITIES, AI_SETTINGS_COLUMNS, normaliseSettings } from "../../../../main/lib/ai/settings";
import { AI_JOB_LABELS } from "../../../../main/lib/ai/runner";
import { freeModels, keyStatus, requestsToday, type FreeModel } from "../../../../main/lib/ai/openrouter";
import { NEWS_OUTLETS } from "../../../../main/lib/ai/news-sources";
import { formAdminClient } from "../../../../main/lib/form-server";

export const metadata: Metadata = { title: "AI Scheduler", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Run = { id: string; job: string; trigger: string; started_at: string; finished_at: string | null; status: string; summary: string | null; stats: Record<string, unknown> };

const messages: Record<string, { tone: "success" | "danger" | "warning"; text: string }> = {
  saved: { tone: "success", text: "AI settings saved and recorded in AI processes." },
  failed: { tone: "danger", text: "The settings could not be saved. Check the values and try again." },
  denied: { tone: "danger", text: "Only the primary administrators can change the AI." },
  "past-time": { tone: "warning", text: "Scheduled switch-on and shutdown times must be in the future." },
  window: { tone: "warning", text: "Daily working hours need a start and an end time that differ." },
};

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  return status === "success" ? "success" : status === "failed" ? "danger" : status === "partial" || status === "running" ? "warning" : "neutral";
}

export default async function AiSchedulerPage({ searchParams }: { searchParams: Promise<{ result?: string; summary?: string }> }) {
  const db = await createStaffClient();
  const access = await db.rpc("staff_roles_authorized");
  if (access.error || access.data !== true) {
    return <PageFrame><PageIntro eyebrow="System · AI" title="AI Scheduler" description="The EPE LAWA AI desk." />
      <EmptyPanel title={access.error ? "Access could not be verified" : "Primary administrators only"} description="The AI can publish and send email on the site's behalf, so only the primary administrators can steer it." actions={<Link href={adminHref("/")}>Back to dashboard</Link>} />
    </PageFrame>;
  }
  const { result, summary } = await searchParams;
  const [settingsResult, runsResult] = await Promise.all([
    db.from("ai_settings").select(AI_SETTINGS_COLUMNS).eq("id", 1).maybeSingle(),
    db.from("ai_runs").select("id,job,trigger,started_at,finished_at,status,summary,stats").order("started_at", { ascending: false }).limit(25),
  ]);
  const settings = normaliseSettings(settingsResult.data as Record<string, unknown> | null);
  if (settingsResult.error || !settings) {
    return <PageFrame><PageIntro eyebrow="System · AI" title="AI Scheduler" description="The EPE LAWA AI desk." />
      <EmptyPanel title="AI tables are not installed" description="Apply the database migration 20261129080000_ai_autopilot_admin_logs_guest_engagement.sql, then reload this page." />
    </PageFrame>;
  }
  let models: FreeModel[] = [];
  let used = 0;
  try {
    const service = formAdminClient();
    [models, used] = await Promise.all([freeModels(service), requestsToday(service)]);
  } catch { /* service key missing: shown below */ }
  const key = await keyStatus();
  const runs = (runsResult.data ?? []) as Run[];
  const notice = result === "ran" ? { tone: "success" as const, text: summary || "Run finished." } : result ? messages[result] : null;
  const budgetLeft = Math.max(0, settings.daily_request_budget - used);

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="System · AI"
        title="AI Scheduler"
        description="The EPE LAWA AI desk: hourly news from trusted outlets, business checks, enquiry replies, approved ads, comment moderation, push alerts and admin log explanations. It runs on free OpenRouter models, shuffled every run, and switches to another model when one fails."
        meta={<><StatusBadge tone={settings.autopilot_enabled ? "success" : "neutral"}>{settings.autopilot_enabled ? "Autopilot ON — acting without approval" : "Autopilot OFF — drafts and recommendations only"}</StatusBadge>{" "}<Link href={adminHref("/ai-processes")}>Open AI processes →</Link></>}
      />
      {notice ? <Notice tone={notice.tone} role={notice.tone === "success" ? "status" : "alert"}>{notice.text}</Notice> : null}

      <div className="ui-grid--3">
        <Panel className="ui-stack-sm">
          <h2>OpenRouter</h2>
          {key.placeholder ? <p><StatusBadge tone="warning">Test key in place</StatusBadge> <code>OPENROUTER_API_KEY</code> holds a test value. Replace it in Vercel → Settings → Environment Variables with your OpenRouter key (it starts with <code>sk-or-</code>), then redeploy. Nothing runs until then.</p>
            : !key.configured ? <p><StatusBadge tone="danger">No API key</StatusBadge> Add <code>OPENROUTER_API_KEY</code> in Vercel → Settings → Environment Variables (Production), then redeploy. Nothing runs until then.</p>
            : !key.reachable ? <p><StatusBadge tone="warning">Key set, not reachable</StatusBadge> OpenRouter did not answer; check the key.</p>
              : <p><StatusBadge tone="success">Connected</StatusBadge>{key.isFreeTier ? " Free models only — OpenRouter allows 50 free-model requests a day on this key, and nothing is ever billed." : " Free models only — nothing is ever billed."}</p>}
          {typeof key.freeDailyRemaining === "number" ? <p className="ui-number">OpenRouter reports {key.freeDailyRemaining} of {key.freeDailyLimit ?? "?"} free requests left today.</p> : null}
        </Panel>
        <Panel className="ui-stack-sm">
          <h2>Today’s budget</h2>
          <p className="ui-number"><strong>{used}</strong> model requests used of <strong>{settings.daily_request_budget}</strong> (resets 01:00 WAT). {budgetLeft} left.</p>
          <p className="ui-muted">Failed attempts count too, so the AI stops at the budget instead of being cut off.</p>
        </Panel>
        <Panel className="ui-stack-sm">
          <h2>Free models available</h2>
          <p className="ui-number"><strong>{models.length}</strong> live free models (refreshed every 6 hours).</p>
          {models.length ? <details><summary>Show models</summary><ul className="ui-list">{models.slice(0, 40).map((model) => <li key={model.id}><code>{model.id}</code></li>)}</ul></details> : <p className="ui-muted">The catalogue is fetched on the first run.</p>}
        </Panel>
      </div>

      <Panel>
        <form action={saveAiSettings} className="ui-stack">
          <SectionHeading title="Autopilot and schedule" description="Times are Lagos time (WAT). The schedule is checked every 5 minutes by the database." />
          <label className="ui-row" style={{ alignItems: "flex-start", gap: 12 }}>
            <input type="checkbox" name="autopilot" defaultChecked={settings.autopilot_enabled} style={{ width: 24, height: 24, marginTop: 2 }} />
            <span><strong>Autopilot</strong><br /><span className="ui-muted">On: the AI publishes, replies, verifies, places ads and moderates without asking. Off: nothing runs on its own; “Run now” only drafts and recommends, and every result waits in AI processes for a human.</span></span>
          </label>
          <div className="ui-form-grid">
            <label className="ui-field"><span className="label">Switch autopilot ON at (one-off)</span><input className="input" type="datetime-local" name="auto_on_at" defaultValue={lagosInputValue(settings.auto_on_at)} /><small>Leave empty for none.</small></label>
            <label className="ui-field"><span className="label">Shut autopilot DOWN at (one-off)</span><input className="input" type="datetime-local" name="auto_off_at" defaultValue={lagosInputValue(settings.auto_off_at)} /><small>Leave empty for none.</small></label>
          </div>
          <label className="ui-row" style={{ gap: 12 }}><input type="checkbox" name="schedule_enabled" defaultChecked={settings.schedule_enabled} style={{ width: 24, height: 24 }} /> <span><strong>Daily working hours</strong> — switch on and off at the same times every day</span></label>
          <div className="ui-form-grid">
            <label className="ui-field"><span className="label">Daily auto-on</span><input className="input" type="time" name="daily_start" defaultValue={settings.daily_start?.slice(0, 5) ?? "06:00"} /></label>
            <label className="ui-field"><span className="label">Daily auto-shutdown</span><input className="input" type="time" name="daily_stop" defaultValue={settings.daily_stop?.slice(0, 5) ?? "23:00"} /><small>An end earlier than the start runs overnight.</small></label>
          </div>

          <SectionHeading title="Limits" />
          <div className="ui-form-grid">
            <label className="ui-field"><span className="label">News run every (minutes)</span><input className="input" type="number" name="news_interval_minutes" min={30} max={1440} defaultValue={settings.news_interval_minutes} /></label>
            <label className="ui-field"><span className="label">Stories per news run</span><input className="input" type="number" name="articles_per_run" min={1} max={6} defaultValue={settings.articles_per_run} /><small>Each story costs about one request. On the free tier keep this at 1.</small></label>
            <label className="ui-field"><span className="label">Daily model request budget</span><input className="input" type="number" name="daily_request_budget" min={5} max={5000} defaultValue={settings.daily_request_budget} /><small>Keep this at 50 or below: OpenRouter allows 50 free-model requests a day per free key.</small></label>
            <label className="ui-field"><span className="label">Push notifications per day (max)</span><input className="input" type="number" name="push_daily_limit" min={0} max={20} defaultValue={settings.push_daily_limit} /></label>
          </div>

          <SectionHeading title="What the AI may do" />
          <ul className="ui-list ui-stack-sm">
            {AI_CAPABILITIES.map((capability) => (
              <li key={capability.key}><label className="ui-row" style={{ alignItems: "flex-start", gap: 12 }}><input type="checkbox" name={`cap_${capability.key}`} defaultChecked={settings.capabilities[capability.key]} style={{ width: 24, height: 24, marginTop: 2 }} /><span><strong>{capability.label}</strong><br /><span className="ui-muted">{capability.hint}</span></span></label></li>
            ))}
          </ul>
          <label className="ui-field"><span className="label">Reason for this change (optional, saved in the audit)</span><input className="input" name="reason" maxLength={500} /></label>
          <SubmitButton className="btn-primary" useLegacyClasses pendingLabel="Saving…">Save AI settings</SubmitButton>
          <p className="ui-muted">Last saved {lagosExact(settings.updated_at)}.</p>
        </form>
      </Panel>

      <Panel className="ui-stack">
        <SectionHeading title="Run a job now" description={settings.autopilot_enabled ? "Runs immediately with autopilot rules (acts without approval)." : "Autopilot is off: the job drafts and recommends only; results wait in AI processes for approval."} />
        <div className="ui-actions" style={{ flexWrap: "wrap", gap: 10 }}>
          {Object.entries(AI_JOB_LABELS).map(([job, label]) => (
            <form action={runAiJobNow} key={job}><input type="hidden" name="job" value={job} /><SubmitButton className="btn-secondary" useLegacyClasses pendingLabel="Running… (up to a minute)">{label}</SubmitButton></form>
          ))}
        </div>
      </Panel>

      <Panel className="ui-stack">
        <SectionHeading title="Recent runs" action={<Link href={adminHref("/ai-processes")}>Full audit →</Link>} />
        {runs.length === 0 ? <p className="ui-muted">No runs yet.</p> : (
          <div className="ui-table"><table><thead><tr><th>Started</th><th>Job</th><th>Trigger</th><th>Status</th><th>Summary</th></tr></thead><tbody>
            {runs.map((run) => <tr key={run.id}><td className="ui-number">{lagosExact(run.started_at)}</td><td>{AI_JOB_LABELS[run.job as keyof typeof AI_JOB_LABELS] ?? run.job}</td><td>{run.trigger}</td><td><StatusBadge tone={statusTone(run.status)}>{run.status}</StatusBadge></td><td>{run.summary ?? "—"}</td></tr>)}
          </tbody></table></div>
        )}
      </Panel>

      <Panel className="ui-stack-sm">
        <SectionHeading title="Trusted news outlets" description="The only sources the AI reads or cites. Stories are ranked Epe first, then Lagos, Nigeria and the world; sport and business get their own slots." />
        <ul className="ui-list">{[...new Map(NEWS_OUTLETS.map((outlet) => [outlet.name, outlet])).values()].map((outlet) => <li key={outlet.name}>{outlet.name} <span className="ui-meta">· {outlet.country === "NG" ? "Nigeria" : "International"}</span></li>)}</ul>
        <p className="ui-muted">Every figure and direct quote in an AI story must appear in the source reports; otherwise the story is saved as a draft and escalated instead of published. Each story lists its sources and says it was compiled by the AI desk, under the Epe Lawa Editorial Desk byline.</p>
      </Panel>
    </PageFrame>
  );
}
