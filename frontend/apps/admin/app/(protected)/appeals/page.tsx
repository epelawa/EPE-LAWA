import {  EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { decideAppeal } from "./actions";

export const dynamic = "force-dynamic";

type AppealRow = {
  id: string;
  user_id: string;
  resource_type: string;
  action_id: string;
  statement: string;
  status: string;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = { user_id: string; handle: string; display_name: string };

const openTone = (status: string) => (status === "open" ? "warning" : status === "granted" ? "success" : "neutral");
const statusLabel = (status: string) => (status === "open" ? "Awaiting review" : status === "granted" ? "Granted" : "Denied");
const resourceLabel = (resourceType: string) => (resourceType === "member_ban" ? "Account ban" : "Content moderation");

export default async function AppealsPage({ searchParams }: { searchParams: Promise<{ decided?: string; error?: string }> }) {
  const query = await searchParams;
  const db = await createStaffClient();
  const { data: allowed } = await db.rpc("has_capability", { p_capability: "moderation.review" });
  if (allowed !== true) {
    return <PageFrame className="ui-stack">
      <PageIntro eyebrow="Trust · Staff" title="Appeals" description="Review member appeals against moderation decisions." />
      <Notice tone="danger" role="alert">The moderation.review capability is required to review appeals.</Notice>
    </PageFrame>;
  }

  const [openResult, decidedResult] = await Promise.all([
    db.from("moderation_appeals")
      .select("id,user_id,resource_type,action_id,statement,status,decision_note,created_at,updated_at")
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .limit(100),
    db.from("moderation_appeals")
      .select("id,user_id,resource_type,action_id,statement,status,decision_note,created_at,updated_at")
      .neq("status", "open")
      .order("updated_at", { ascending: false })
      .limit(40),
  ]);

  if (openResult.error || decidedResult.error) {
    return <PageFrame className="ui-stack">
      <PageIntro eyebrow="Trust · Staff" title="Appeals" description="Review member appeals against moderation decisions." />
      <EmptyPanel title="Queue unavailable" description="Appeals could not be loaded. Try again later." />
    </PageFrame>;
  }

  const openRows = (openResult.data ?? []) as AppealRow[];
  const decidedRows = (decidedResult.data ?? []) as AppealRow[];
  const memberIds = [...new Set([...openRows, ...decidedRows].map((row) => row.user_id))];
  const { data: profileRows } = memberIds.length
    ? await db.from("profiles").select("user_id,handle,display_name").in("user_id", memberIds)
    : { data: [] };
  const members = new Map(((profileRows ?? []) as ProfileRow[]).map((row) => [row.user_id, row]));

  const memberLabel = (row: AppealRow) => {
    const profile = members.get(row.user_id);
    return profile ? `@${profile.handle} · ${profile.display_name}` : "Member record unavailable";
  };

  const appealCard = (row: AppealRow) => <li key={row.id}><Panel className="ui-stack-sm">
    <div className="ui-row">
      <StatusBadge tone={openTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      <span className="ui-meta">{resourceLabel(row.resource_type)} · opened {new Date(row.created_at).toLocaleString("en-NG")}</span>
    </div>
    <p className="ui-meta">{memberLabel(row)}</p>
    <p className="ui-prose">{row.statement}</p>
    {row.status === "open" ? (
      <form action={decideAppeal} className="ui-stack-sm ui-divider">
        <input type="hidden" name="appeal_id" value={row.id} />
        <div className="ui-form-grid">
          <label className="ui-field"><span className="label">Decision</span>
            <select name="status" required defaultValue="" className="input">
              <option value="" disabled>Choose a decision</option>
              <option value="granted">Grant — lift the restriction</option>
              <option value="denied">Deny — keep the decision</option>
            </select>
          </label>
          <label className="ui-field"><span className="label">Decision note (required, shown to the member)</span><textarea name="note" maxLength={1000} className="input" /></label>
        </div>
        <div className="ui-actions"><SubmitButton pendingLabel="Recording…" className="btn-primary" useLegacyClasses useLegacyClasses>Record appeal decision</SubmitButton></div>
      </form>
    ) : (
      <p className="ui-meta">Decision: {row.decision_note ?? "—"} · {new Date(row.updated_at).toLocaleString("en-NG")}</p>
    )}
  </Panel></li>;

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Trust · Staff" title="Appeals" description="Member appeals against bans and moderation actions. Every decision requires a written note the member can read." />
    {query.decided ? <Notice tone="success" role="status">Appeal decision recorded.</Notice> : null}
    {query.error ? <Notice tone="danger" role="alert">The appeal decision needs grant/deny and a written note.</Notice> : null}

    {!openRows.length && !decidedRows.length ? <EmptyPanel title="No appeals" description="Member appeals appear here as they are submitted." /> : null}
    {openRows.length ? <section className="ui-stack-sm">
      <SectionHeading eyebrow="Queue" title="Open appeals" description="Grant to lift the restriction; deny to keep it. Both answers are written to the member." />
      <ul className="ui-list ui-stack-sm">{openRows.map(appealCard)}</ul>
    </section> : null}
    {decidedRows.length ? <section className="ui-stack-sm">
      <SectionHeading eyebrow="History" title="Decided appeals" description="Past decisions with the notes that were shown to members." />
      <ul className="ui-list ui-stack-sm">{decidedRows.map(appealCard)}</ul>
    </section> : null}
  </PageFrame>;
}
