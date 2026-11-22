import { SubmitButton } from "@epelawa/ui";
import Link from "next/link";
import { createClient } from "../lib/supabase";
import { pollVote } from "../app/poll-actions";

type PollRow = { id: string; question: string; ends_at: string | null };
type OptionRow = { id: string; label: string };
type ResultRow = { option_id: string; label: string; votes: number };

export default async function SitePoll() {
  const db = await createClient();
  const [{ data: { user } }, { data: poll }] = await Promise.all([
    db.auth.getUser(),
    db.from("site_polls").select("id,question,ends_at")
      .eq("status", "active")
      .or("ends_at.is.null,ends_at.gt." + new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!poll) return null;
  const pollRow = poll as PollRow;
  const [optionsResult, resultsResult, myVoteResult] = await Promise.all([
    db.from("site_poll_options").select("id,label").eq("poll_id", pollRow.id).order("sort_order", { ascending: true }),
    db.rpc("site_poll_results", { p_poll_id: pollRow.id }),
    user
      ? db.from("site_poll_votes").select("option_id").eq("poll_id", pollRow.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null } as { data: { option_id: string } | null }),
  ]);
  if (optionsResult.error || optionsResult.data === null) return null;
  const options = optionsResult.data as OptionRow[];
  const counts = new Map<string, number>(
    ((resultsResult.data ?? []) as ResultRow[]).map((row) => [row.option_id, Number(row.votes)]),
  );
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const myOption = (myVoteResult.data as { option_id: string } | null)?.option_id ?? null;
  const canVote = Boolean(user) && !myOption;
  const percent = (optionId: string) => {
    const count = counts.get(optionId) ?? 0;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  return <section className="site-poll ui-card" aria-labelledby="site-poll-question">
    <p className="ui-eyebrow">Community poll</p>
    <h2 id="site-poll-question" className="text-lg font-semibold">{pollRow.question}</h2>
    {canVote ? <form action={pollVote} className="ui-stack-sm pt-1">
      <fieldset className="ui-stack-sm border-0 p-0">
        <legend className="sr-only">Choose one option</legend>
        {options.map((option) => <label key={option.id} className="flex min-h-11 items-center gap-3">
          <input type="radio" name="option_id" value={option.id} required />
          <span>{option.label}</span>
        </label>)}
      </fieldset>
      <div className="ui-actions"><SubmitButton pendingLabel="Voting…" className="btn-primary w-fit">Cast your vote</SubmitButton></div>
      <p className="ui-meta">One vote per member; you can change it until the poll closes.</p>
    </form> : <div className="ui-stack-sm pt-1">
      {options.map((option) => {
        const chosen = myOption === option.id;
        const share = percent(option.id);
        return <div key={option.id} className="site-poll-option" aria-label={`${option.label}: ${share} percent`}>
          <div className="site-poll-bar"><span style={{ width: `${share}%` }} aria-hidden="true" /></div>
          <div className="site-poll-label"><span>{option.label}{chosen ? <span className="sr-only"> (your vote)</span> : null}</span><span className="ui-meta">{share}% · {counts.get(option.id) ?? 0}</span></div>
        </div>;
      })}
      {user && myOption ? <p className="ui-meta" role="status">Your vote is counted. You can change it while the poll is open.</p> : null}
      {!user ? <p className="ui-meta"><Link className="ui-text-link" href={`/login?next=${encodeURIComponent("/")}`}>Sign in</Link> to cast your vote.</p> : null}
    </div>}
  </section>;
}
