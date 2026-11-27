import type { Metadata } from "next";
import Link from "../../../components/admin-link";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { adminHref } from "../../../lib/admin-path";
import { lagosExact, lagosInputValue } from "../../../lib/lagos-time";
import { runAiJobNow, saveAiModels, saveAiSettings } from "../../../lib/ai-actions";
import { AI_CAPABILITIES, AI_SETTINGS_COLUMNS, MAX_MODELS_PER_JOB, MODEL_JOBS, normaliseSettings } from "../../../../main/lib/ai/settings";
import { AI_JOB_LABELS } from "../../../../main/lib/ai/runner";
import { keyStatus, loadFreeModels, modelQueue, requestsToday, type ModelList } from "../../../../main/lib/ai/openrouter";
import { DESK_LABELS, NEWS_OUTLETS, type Desk } from "../../../../main/lib/ai/news-sources";
import LiveRefresh from "../../../components/live-refresh";
import styles from "./ai-scheduler.module.css";
import { ChoiceWithCustom, NewsScheduleField } from "../../../components/ai-limit-fields";
import { NEWS_LIMITS, nextNewsSlot } from "../../../../main/lib/ai/news-schedule";
import { formAdminClient } from "../../../../main/lib/form-server";
import { to12h } from "../../../../main/lib/clock12";

export const metadata: Metadata = { title: "AI Scheduler", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Run = { id: string; job: string; trigger: string; started_at: string; finished_at: string | null; status: string; summary: string | null; stats: Record<string, unknown>; progress?: string | null; progress_at?: string | null };

const messages: Record<string, { tone: "success" | "danger" | "warning"; text: string }> = {
  saved: { tone: "success", text: "AI settings saved and recorded in AI processes." },
  failed: { tone: "danger", text: "The settings could not be saved. Check the values and try again." },
  denied: { tone: "danger", text: "Only the primary administrators can change the AI." },
  "past-time": { tone: "warning", text: "Scheduled switch-on and shutdown times must be in the future." },
  window: { tone: "warning", text: "Daily working hours need a start and an end time that differ." },
  custom: { tone: "warning", text: "A custom value is outside its limits, so nothing was saved. The allowed range is shown under each field." },
  times: { tone: "warning", text: "Add at least one news time, or switch the news schedule back to “Every …”." },
  "models-saved": { tone: "success", text: "Model choices saved. Each job now tries its models in the order you set." },
  "models-failed": { tone: "danger", text: "The model choices could not be saved. Only free models (ending in :free) can be chosen." },
  "models-unknown": { tone: "warning", text: "One of the chosen models is not in OpenRouter's free list any more, so nothing was saved. The list below is live from OpenRouter — choose again." },
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
    db.from("ai_runs").select("id,job,trigger,started_at,finished_at,status,summary,stats,progress,progress_at").order("started_at", { ascending: false }).limit(25),
  ]);
  const settings = normaliseSettings(settingsResult.data as Record<string, unknown> | null);
  if (settingsResult.error || !settings) {
    return <PageFrame><PageIntro eyebrow="System · AI" title="AI Scheduler" description="The EPE LAWA AI desk." />
      <EmptyPanel title="AI tables are not installed" description="Apply the database migration 20261129080000_ai_autopilot_admin_logs_guest_engagement.sql, then reload this page." />
    </PageFrame>;
  }
  let list: ModelList = { models: [], source: "none", loadedAt: null };
  let used = 0;
  try {
    const service = formAdminClient();
    const [loaded, count] = await Promise.all([loadFreeModels(service), requestsToday(service)]);
    list = loaded;
    used = count;
  } catch { /* service key missing: shown below */ }
  const models = list.models;
  const key = await keyStatus();
  const runs = (runsResult.data ?? []) as Run[];
  const notice = result === "ran" ? { tone: "success" as const, text: summary || "Run finished." } : result ? messages[result] : null;
  const budgetLeft = Math.max(0, settings.daily_request_budget - used);

  const running = runs.filter((run) => run.status === "running" && Date.now() - Date.parse(run.progress_at ?? run.started_at) < 6 * 60_000);
  const runningByJob = new Map(running.map((run) => [run.job, run]));
  const budgetShare = settings.daily_request_budget ? Math.min(100, Math.round((used / settings.daily_request_budget) * 100)) : 0;
  const choiceLabel = (index: number) => (index === 0 ? "1st choice" : `Backup ${index}`);
  const minutesLabel = (value: number) => (value % 1440 === 0 ? `Every ${value / 1440 === 1 ? "day" : `${value / 1440} days`}` : value % 60 === 0 ? `Every ${value / 60 === 1 ? "hour" : `${value / 60} hours`}` : `Every ${value} minutes`);
  const nextSlot = nextNewsSlot(settings.news_times, Date.now());
  const newsPlan = `${settings.news_times.length ? `News runs at ${settings.news_times.map((value) => to12h(value)).join(", ")} (Lagos)${nextSlot ? `; next at ${lagosExact(new Date(nextSlot).toISOString())}` : ""}` : `News runs ${minutesLabel(settings.news_interval_minutes).toLowerCase()}`}, up to ${settings.articles_per_run} ${settings.articles_per_run === 1 ? "story" : "stories"} each time.${settings.news_owed ? ` ${settings.news_owed} ${settings.news_owed === 1 ? "story is" : "stories are"} still owed from the last run and will be written at the next pass.` : ""}`;
  const desks = new Map<Desk, Set<string>>();
  for (const outlet of NEWS_OUTLETS) {
    const names = desks.get(outlet.desk) ?? new Set<string>();
    names.add(`${outlet.name}${outlet.country === "NG" ? "" : " (intl)"}`);
    desks.set(outlet.desk, names);
  }

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="System · AI"
        title="AI Scheduler"
        description="The EPE LAWA AI desk writes news from trusted outlets, checks businesses, replies to enquiries, places approved ads, moderates comments and explains admin activity — on free OpenRouter models only."
        meta={<Link href={adminHref("/ai-processes")}>Open AI processes →</Link>}
      />
      {notice ? <Notice tone={notice.tone} role={notice.tone === "success" ? "status" : "alert"}>{notice.text}</Notice> : null}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Autopilot</p>
          <p className={styles.statValue}><StatusBadge tone={settings.autopilot_enabled ? "success" : "neutral"}>{settings.autopilot_enabled ? "ON" : "OFF"}</StatusBadge></p>
          <p className={styles.statNote}>{settings.autopilot_enabled ? "Acting without approval." : "Drafts and recommendations only."}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>OpenRouter</p>
          <p className={styles.statValue}>{key.placeholder ? <StatusBadge tone="warning">Test key</StatusBadge> : !key.configured ? <StatusBadge tone="danger">No key</StatusBadge> : !key.reachable ? <StatusBadge tone="warning">Not reachable</StatusBadge> : <StatusBadge tone="success">Connected</StatusBadge>}</p>
          <p className={styles.statNote}>{key.placeholder ? <>Replace <code>OPENROUTER_API_KEY</code> in Vercel with your <code>sk-or-</code> key, then redeploy.</> : !key.configured ? <>Add <code>OPENROUTER_API_KEY</code> in Vercel, then redeploy.</> : typeof key.freeDailyRemaining === "number" ? `${key.freeDailyRemaining} of ${key.freeDailyLimit ?? "?"} free requests left today. Never billed.` : "Free models only. Never billed."}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Today’s requests</p>
          <p className={styles.statValue}>{used} <span className={styles.statNote}>of {settings.daily_request_budget}</span></p>
          <div className={styles.meter} aria-hidden="true"><span style={{ width: `${budgetShare}%`, background: budgetShare > 85 ? "#dc2626" : budgetShare > 60 ? "#d97706" : "#16a34a" }} /></div>
          <p className={styles.statNote}>{budgetLeft} left · resets 01:00 WAT. Failed attempts count too.</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Free models</p>
          <p className={styles.statValue}>{models.length}</p>
          <p className={styles.statNote}>{list.source === "live" ? "Live from OpenRouter." : list.error ?? "OpenRouter could not be reached."} <a href="#ai-models">Choose ↓</a></p>
        </div>
      </div>

      <Panel className="ui-stack">
        <SectionHeading title="Run a job now" description={settings.autopilot_enabled ? "Starts straight away with autopilot rules and opens a live view of what it is doing." : "Autopilot is off: the job only drafts and recommends; results wait in AI processes for approval."} action={<LiveRefresh active={running.length > 0} seconds={5} />} />
        <div className={styles.runGrid}>
          {Object.entries(AI_JOB_LABELS).map(([job, label]) => {
            const active = runningByJob.get(job);
            const last = runs.find((run) => run.job === job && run.status !== "running");
            return (
              <div className={styles.runCard} key={job}>
                <div className="ui-stack-sm">
                  <h3>{label}</h3>
                  <p>{active ? <><StatusBadge tone="warning">running</StatusBadge> {active.progress ?? "Starting…"}</> : last ? <>Last: <StatusBadge tone={statusTone(last.status)}>{last.status}</StatusBadge> {lagosExact(last.started_at)}</> : "Not run yet."}</p>
                </div>
                {active ? <a className="btn-primary" href={adminHref(`/ai-processes/runs/${active.id}`)}>Watch live</a> : (
                  <form action={runAiJobNow}><input type="hidden" name="job" value={job} /><SubmitButton className="btn-secondary" useLegacyClasses pendingLabel="Starting…">Run now</SubmitButton></form>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="ui-stack">
        <SectionHeading title="Recent runs" description="Click a run to see every step it took, live while it is running." action={<Link href={adminHref("/ai-processes")}>Full audit →</Link>} />
        {runs.length === 0 ? <p className="ui-muted">No runs yet.</p> : (
          <div className="ui-table"><table><thead><tr><th>Started (WAT)</th><th>Job</th><th>Status</th><th>Result</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>
            {runs.slice(0, 15).map((run) => (
              <tr key={run.id} className={styles.runRow}>
                <td className="ui-number"><a href={adminHref(`/ai-processes/runs/${run.id}`)}>{lagosExact(run.started_at)}</a></td>
                <td>{AI_JOB_LABELS[run.job as keyof typeof AI_JOB_LABELS] ?? run.job}{run.trigger === "manual" ? <span className="ui-meta"> · Run now</span> : null}</td>
                <td><StatusBadge tone={statusTone(run.status)}>{run.status}</StatusBadge></td>
                <td>{run.status === "running" ? run.progress ?? "Starting…" : run.summary ?? "—"}</td>
                <td><a className="ui-text-link" href={adminHref(`/ai-processes/runs/${run.id}`)}>{run.status === "running" ? "Watch live" : "Details"}</a></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </Panel>

      <Panel className="ui-stack" id="ai-models">
        <SectionHeading title="AI models for each job" description="Loaded live from OpenRouter each time this page opens. Pick the models each job uses, in order: it always tries the 1st choice first and moves to a backup only when a model is busy, too slow or gives an unusable answer. Nothing is shuffled." action={<a className="btn-secondary" href={adminHref("/ai-scheduler#ai-models")}>Reload list</a>} />
        {list.source === "live" && list.loadedAt ? <p className="ui-meta" style={{ margin: 0 }}>{models.length} free models loaded from openrouter.ai at {lagosExact(list.loadedAt)}.</p> : null}
        {list.source === "saved" ? <Notice tone="warning" role="status">{list.error ?? "OpenRouter could not be reached"}. Showing the list last loaded from OpenRouter{list.loadedAt ? ` at ${lagosExact(list.loadedAt)}` : ""}.</Notice> : null}
        {list.source === "none" ? <Notice tone="warning" role="status">{list.error ?? "OpenRouter's free model list could not be loaded"}. Reload to try again.</Notice> : null}
        <form action={saveAiModels} className="ui-stack">
          <div className={styles.jobs}>
            {MODEL_JOBS.map((job) => {
              const chosen = settings.job_models[job.key] ?? [];
              const plan = modelQueue(models, chosen, MAX_MODELS_PER_JOB);
              const missing = new Set(plan.missing);
              return (
                <fieldset key={job.key} className={styles.job}>
                  <div className={styles.jobHead}><h3>{job.label}</h3><p>{job.hint}</p></div>
                  <div className={styles.choices}>
                    {Array.from({ length: MAX_MODELS_PER_JOB }, (_, index) => {
                      const current = chosen[index] ?? "";
                      return (
                        <label key={index} className={styles.choice}>
                          {choiceLabel(index)}
                          <select className="input" name={`model_${job.key}_${index}`} defaultValue={current} aria-label={`${job.label}: ${choiceLabel(index)}`}>
                            <option value="">{index === 0 ? "Automatic" : "None"}</option>
                            {current && missing.has(current) ? <option value={current}>{current} (no longer free)</option> : null}
                            {models.map((model) => <option key={model.id} value={model.id} title={model.id}>{model.name.replace(/\s*\(free\)\s*$/i, "")}{model.expires ? " · ending soon" : ""}</option>)}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                  <p className={styles.queue}>
                    {plan.usingDefault ? "Automatic — " : "Tries: "}
                    {plan.queue.length ? plan.queue.map((id, index) => <span key={id}>{index ? " → " : ""}<code>{id}</code></span>) : "no free model available yet"}
                    {plan.missing.length ? <> · <StatusBadge tone="warning">{plan.missing.length} chosen model{plan.missing.length > 1 ? "s" : ""} no longer free</StatusBadge></> : null}
                  </p>
                </fieldset>
              );
            })}
          </div>
          <div className={styles.formFooter}>
            <label className={styles.field}><span>Reason for this change (optional, saved in the audit)</span><input className="input" name="reason" maxLength={500} /></label>
            <SubmitButton className="btn-primary" useLegacyClasses pendingLabel="Saving…">Save model choices</SubmitButton>
          </div>
        </form>
        {models.length ? (
          <details>
            <summary>Details of all {models.length} free models</summary>
            <div className="ui-table"><table><thead><tr><th>Model</th><th>Provider</th><th>Context</th><th>JSON output</th><th>Notes</th></tr></thead><tbody>
              {models.map((model) => (
                <tr key={model.id}>
                  <td><a href={`https://openrouter.ai/${model.id}`} target="_blank" rel="noreferrer">{model.name}</a><br /><code>{model.id}</code>{model.description ? <><br /><span className="ui-meta">{model.description}</span></> : null}</td>
                  <td>{model.provider ?? model.id.split("/")[0]}</td>
                  <td className="ui-number">{model.context.toLocaleString("en-NG")} tokens</td>
                  <td>{model.json ? <StatusBadge tone="success">Yes</StatusBadge> : <StatusBadge>Not stated</StatusBadge>}</td>
                  <td>{[model.reasoning ? "Thinks before answering" : "", model.expires ? `Going away ${model.expires}` : "", model.created ? `Added ${new Date(model.created * 1000).toISOString().slice(0, 10)}` : ""].filter(Boolean).join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody></table></div>
          </details>
        ) : null}
      </Panel>

      <Panel>
        <form action={saveAiSettings} className="ui-stack">
          <SectionHeading title="Autopilot, schedule and limits" description="Times are Lagos time (WAT). The schedule is checked every 5 minutes." />

          <div className={styles.section}>
            <h3>Autopilot</h3>
            <label className={styles.toggle}>
              <input type="checkbox" name="autopilot" defaultChecked={settings.autopilot_enabled} />
              <span><strong>Let the AI act on its own</strong><span>On: it publishes, replies, verifies, places ads and moderates without asking. Off: nothing runs by itself; “Run now” only drafts and recommends.</span></span>
            </label>
            <div className={styles.fields}>
              <label className={styles.field}><span>Switch ON at (one-off)</span><input className="input" type="datetime-local" name="auto_on_at" defaultValue={lagosInputValue(settings.auto_on_at)} /><small>Leave empty for none.</small></label>
              <label className={styles.field}><span>Switch OFF at (one-off)</span><input className="input" type="datetime-local" name="auto_off_at" defaultValue={lagosInputValue(settings.auto_off_at)} /><small>Leave empty for none.</small></label>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Daily working hours</h3>
            <label className={styles.toggle}>
              <input type="checkbox" name="schedule_enabled" defaultChecked={settings.schedule_enabled} />
              <span><strong>Switch on and off at the same times every day</strong><span>An end earlier than the start runs overnight.</span></span>
            </label>
            <div className={styles.fields}>
              <label className={styles.field}><span>Starts at</span><input className="input" type="time" name="daily_start" defaultValue={settings.daily_start?.slice(0, 5) ?? "06:00"} /></label>
              <label className={styles.field}><span>Stops at</span><input className="input" type="time" name="daily_stop" defaultValue={settings.daily_stop?.slice(0, 5) ?? "23:00"} /></label>
            </div>
          </div>

          <div className={styles.section}>
            <h3>News schedule</h3>
            <NewsScheduleField
              interval={settings.news_interval_minutes}
              times={settings.news_times}
              intervalOptions={[15, 30, 45, 60, 90, 120, 180, 240, 360, 720, 1440].map((value) => ({ value, label: minutesLabel(value) }))}
              min={NEWS_LIMITS.interval.min}
              max={NEWS_LIMITS.interval.max}
            />
            <p className="ui-meta" style={{ margin: 0 }}>{newsPlan}</p>
          </div>

          <div className={styles.section}>
            <h3>Limits</h3>
            <div className={styles.fields}>
              <ChoiceWithCustom
                name="articles_per_run"
                label="Maximum stories per news run"
                options={[1, 2, 3, 4, 5, 6, 8, 10].map((value) => ({ value, label: `${value} ${value === 1 ? "story" : "stories"}` }))}
                current={settings.articles_per_run}
                min={NEWS_LIMITS.articles.min}
                max={NEWS_LIMITS.articles.max}
                suffix="stories"
                hint="Each story takes up to 2 minutes and about one request. Stories that do not fit in one run are written at the next pass, 5 minutes later."
              />
              <ChoiceWithCustom
                name="daily_request_budget"
                label="Daily model request budget"
                options={[10, 20, 30, 40, 50, 100, 200, 500, 1000].map((value) => ({ value, label: `${value} requests${value === 50 ? " (free-key limit)" : value > 50 ? " (needs OpenRouter credit history)" : ""}` }))}
                current={settings.daily_request_budget}
                min={NEWS_LIMITS.budget.min}
                max={NEWS_LIMITS.budget.max}
                suffix="requests"
                hint="The AI stops for the day when this is used up."
              />
              <ChoiceWithCustom
                name="push_daily_limit"
                label="Push notifications per day"
                options={[0, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map((value) => ({ value, label: value === 0 ? "None" : `Up to ${value}` }))}
                current={settings.push_daily_limit}
                min={NEWS_LIMITS.push.min}
                max={NEWS_LIMITS.push.max}
                suffix="per day"
                hint="Each story the AI publishes is sent to news subscribers with its cover photo until this many have gone out today."
              />
              <ChoiceWithCustom
                name="breaking_hours"
                label="Breaking news stays up for"
                options={[1, 2, 3, 4, 6, 8, 12, 24, 48].map((value) => ({ value, label: `${value} hour${value === 1 ? "" : "s"}` }))}
                current={settings.breaking_hours}
                min={NEWS_LIMITS.breakingHours.min}
                max={NEWS_LIMITS.breakingHours.max}
                suffix="hours"
                hint="How long a story the AI flags as breaking scrolls in the breaking-news ticker."
              />
              <ChoiceWithCustom
                name="breaking_max"
                label="Breaking stories at once"
                options={[1, 2, 3, 4, 5, 6, 8, 10].map((value) => ({ value, label: `Up to ${value}` }))}
                current={settings.breaking_max}
                min={NEWS_LIMITS.breakingMax.min}
                max={NEWS_LIMITS.breakingMax.max}
                suffix="stories"
                hint="The AI will not flag more than this many live breaking stories (editors' flags count too)."
              />
            </div>
          </div>

          <div className={styles.section}>
            <h3>What the AI may do</h3>
            <div className={styles.toggles}>
              {AI_CAPABILITIES.map((capability) => (
                <label key={capability.key} className={styles.toggle}>
                  <input type="checkbox" name={`cap_${capability.key}`} defaultChecked={settings.capabilities[capability.key]} />
                  <span><strong>{capability.label}</strong><span>{capability.hint}</span></span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formFooter}>
            <label className={styles.field}><span>Reason for this change (optional, saved in the audit)</span><input className="input" name="reason" maxLength={500} /></label>
            <SubmitButton className="btn-primary" useLegacyClasses pendingLabel="Saving…">Save settings</SubmitButton>
          </div>
          <p className="ui-meta" style={{ margin: 0 }}>Last saved {lagosExact(settings.updated_at)}.</p>
        </form>
      </Panel>

      <Panel className="ui-stack">
        <SectionHeading title="Where the news comes from" description="The only outlets the AI reads, at home and abroad, by subject. Stories rank Epe first, then Lagos, Nigeria and the world, and every subject desk gets its turn." />
        <div className={styles.desks}>
          {[...desks.entries()].map(([desk, names]) => (
            <div key={desk} className={styles.desk}>
              <h3>{DESK_LABELS[desk]}</h3>
              <ul className={styles.chips}>{[...names].map((name) => <li key={name}>{name}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="ui-muted" style={{ margin: 0 }}>Every figure and direct quote in an AI story must appear in the source reports; otherwise it is saved as a draft for an editor instead of being published.</p>
      </Panel>
    </PageFrame>
  );
}
