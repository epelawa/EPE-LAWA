import { SubmitButton } from "@epelawa/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { formatLagosDateTime } from "../../../../lib/dates";
import { publicMediaUrl } from "../../../../lib/media";
import { EmptyPanel, Notice, PageFrame, StatusBadge } from "../../../../components/design-system";
import { replyToThread, reportPost, voteInPoll } from "../../actions";
import ReactionBar from "../../reaction-bar";
import ForumReadPing from "../../read-ping";
import styles from "../../forum.module.css";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ posted?: string; reported?: string; voted?: string; forum_error?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; return { title: `Forum thread · ${slug}` }; }
export default async function ThreadPage({ params, searchParams }: Props) {
  const [{ slug }, notice] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data: { user } }, { data: thread, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("forum_threads").select("id,category_id,slug,title,state,created_at").eq("slug", slug).maybeSingle(),
  ]);
  if (error) return <PageFrame><Notice role="status" tone="warning">This discussion could not be loaded. Please try again later.</Notice></PageFrame>;
  if (!thread) notFound();
  const [{ data: category }, { data: posts, error: postsError }, { data: poll }] = await Promise.all([
    supabase.from("forum_categories").select("slug,name").eq("id", thread.category_id).maybeSingle(),
    supabase.from("forum_posts").select("id,author_id,body,state,created_at").eq("thread_id", thread.id).order("created_at").limit(100),
    supabase.from("forum_polls").select("id,question,closes_at").eq("thread_id", thread.id).maybeSingle(),
  ]);
  const [{ data: options }, { data: results }, { data: voterRows }] = poll ? await Promise.all([
    supabase.from("forum_poll_options").select("id,label,sort_order").eq("poll_id", poll.id).order("sort_order"),
    supabase.from("forum_poll_results").select("option_id,vote_count").eq("poll_id", poll.id),
    user ? supabase.from("forum_poll_votes").select("option_id").eq("poll_id", poll.id).eq("voter_id", user.id) : Promise.resolve({ data: [] }),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  const authors = [...new Set((posts ?? []).map((post) => post.author_id).filter((id): id is string => Boolean(id)))];
  const { data: profiles } = authors.length ? await supabase.from("profiles").select("user_id,handle,display_name,is_verified,verified_at,deleted_at,avatar_key").in("user_id", authors) : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const counts = new Map((results ?? []).map((row) => [row.option_id, row.vote_count]));
  const totalVotes = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const hasVoted = Boolean(voterRows?.length);
  const reactionMap = new Map<string, number>();
  const postIds = (posts ?? []).map((post) => post.id);
  if (postIds.length) {
    try {
      const { data: reactionRows, error: reactionError } = await supabase.rpc("forum_reaction_counts", { p_post_ids: postIds });
      if (!reactionError && Array.isArray(reactionRows)) {
        for (const row of reactionRows as { post_id?: string; count?: number }[]) {
          if (typeof row?.post_id === "string" && typeof row.count === "number") reactionMap.set(row.post_id, row.count);
        }
      }
    } catch { /* reactions stay at zero */ }
  }
  const canReply = user !== null && thread.state === "open";
  const pollOpen = thread.state === "open" && (!poll?.closes_at || new Date(poll.closes_at).getTime() > Date.now());
  const signIn = `/login?next=${encodeURIComponent(`/forum/thread/${slug}`)}`;
  return <PageFrame className={`ui-stack forum-shell ${styles.threadShell}`}>
    {user && thread.state === "open" ? <ForumReadPing threadId={thread.id} /> : null}
    <nav className={styles.threadBar} aria-label="Conversation header">
      <span className={styles.railAvatar} aria-hidden="true">{thread.title.trim().slice(0, 1).toLocaleUpperCase("en-NG")}</span>
      <div className={styles.threadBarCopy}>
        <h1 className={styles.threadTitle}>{thread.title}</h1>
        <p className={styles.threadBarMeta}>{category ? <Link className={styles.threadChannel} href={`/forum/category/${encodeURIComponent(category.slug)}`}>{category.name}</Link> : null} · {(posts ?? []).length} {(posts ?? []).length === 1 ? "message" : "messages"} · {thread.state === "locked" ? "Locked" : "Open"}</p>
      </div>
      <span className={styles.threadState}>{thread.state === "locked" ? <StatusBadge tone="warning">Locked</StatusBadge> : <StatusBadge tone="success">Open</StatusBadge>}</span>
    </nav>
    <div className="ui-stack-sm" aria-live="polite">{notice.posted ? <Notice role="status" tone="success">Your reply was posted.</Notice> : null}{notice.reported ? <Notice role="status" tone="success">Your report was submitted for moderator review.</Notice> : null}{notice.voted ? <Notice role="status" tone="success">Your vote was recorded.</Notice> : null}{notice.forum_error ? <Notice role="alert" tone="danger">{notice.forum_error}</Notice> : null}</div>
    {poll ? <section className={styles.pollCard} aria-labelledby="poll-question">
      <div><p className="ui-eyebrow">Community poll</p><h2 id="poll-question">{poll.question}</h2><p className="ui-meta">{totalVotes} {totalVotes === 1 ? "vote" : "votes"} · totals only; ballots are private</p></div>
      {pollOpen && user && !hasVoted ? <form action={voteInPoll} className="ui-stack-sm"><input type="hidden" name="poll_id" value={poll.id} /><input type="hidden" name="thread_slug" value={thread.slug} /><fieldset className="ui-stack-sm"><legend className="sr-only">Choose one answer</legend>{(options ?? []).map((option) => <label key={option.id} className={styles.pollOption}><input type="radio" name="option_id" value={option.id} required />{option.label}</label>)}</fieldset><SubmitButton pendingLabel="Submitting…" className="btn-primary" useLegacyClasses>Submit vote</SubmitButton></form> : null}
      {pollOpen && !user ? <p><Link className="ui-text-link" href={signIn}>Sign in to vote</Link></p> : null}
      {(!pollOpen || hasVoted) ? <ul className={styles.pollResults} aria-label="Poll results">{(options ?? []).map((option) => { const count = counts.get(option.id) ?? 0; const percent = totalVotes ? Math.round(count * 100 / totalVotes) : 0; return <li key={option.id}><div className={styles.pollResultRow}><span>{option.label}{voterRows?.some((row) => row.option_id === option.id) ? " — your choice" : ""}</span><span className="ui-number">{count} ({percent}%)</span></div><div className={styles.pollTrack} aria-hidden="true"><span style={{ width: `${percent}%` }} /></div></li>; })}</ul> : null}
      {!pollOpen ? <p className="ui-muted">Voting is closed.</p> : null}
    </section> : null}
    <section aria-label="Messages">{postsError ? <Notice role="status" tone="warning">Posts could not be loaded. Please try again later.</Notice> : !posts?.length ? <EmptyPanel title="No visible posts" description="There are no posts available to show in this discussion." /> : <ol className={styles.bubbleList}>{posts.map((post, index) => {
      const profile = post.author_id ? profileById.get(post.author_id) : null;
      const verified = profile?.is_verified && profile.verified_at && new Date(profile.verified_at).getTime() <= Date.now() && !profile.deleted_at;
      const own = Boolean(user && post.author_id && post.author_id === user.id);
      const avatar = profile && !profile.deleted_at ? publicMediaUrl(profile.avatar_key) : null;
      const bubbleClass = post.state === "deleted" ? styles.bubbleDeleted : own ? styles.bubbleOwn : styles.bubble;
      return <li key={post.id} className={styles.bubbleRow} data-own={own ? "true" : undefined} aria-label={`Post ${index + 1}`}>
        {post.state === "deleted"
          ? <div className={bubbleClass}><p className="ui-meta"><em>This post was removed.</em></p></div>
          : <>
            <span className={styles.bubbleAvatar} aria-hidden="true">{avatar ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={avatar} alt="" width={34} height={34} className={styles.postAvatar} /> : "•"}</span>
            <div className={bubbleClass}>
              <span className={styles.bubbleByline}>
                <strong>{profile && !profile.deleted_at ? profile.display_name : "Community member"}</strong>
                {profile && !profile.deleted_at ? <span className={styles.bubbleHandle}>@{profile.handle}</span> : null}
                {verified ? <span className={styles.verifiedStamp}>Verified</span> : null}
              </span>
              <span className={styles.bubbleBody}>{post.body}</span>
              <span className={styles.bubbleFoot}><time dateTime={post.created_at}>{formatLagosDateTime(post.created_at)} Epe time</time></span>
              <ReactionBar postId={post.id} initialCount={reactionMap.get(post.id) ?? 0} signedIn={Boolean(user)} />
              {user ? <details className={styles.bubbleReport}><summary>Report</summary><form action={reportPost} className="ui-stack-sm"><input type="hidden" name="post_id" value={post.id} /><input type="hidden" name="thread_slug" value={thread.slug} /><div className="ui-field"><label className="label" htmlFor={`reason-${post.id}`}>Reason</label><select className="input" id={`reason-${post.id}`} name="reason" required><option value="">Choose a reason</option><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="hate">Hate</option><option value="misinformation">Misinformation</option><option value="privacy">Privacy concern</option><option value="other">Other</option></select></div><div className="ui-field"><label className="label" htmlFor={`note-${post.id}`}>Note (optional)</label><textarea className="input" id={`note-${post.id}`} name="note" maxLength={1000} rows={3} /></div><SubmitButton pendingLabel="Reporting…" className="btn-secondary" useLegacyClasses>Submit report</SubmitButton></form></details> : null}
            </div>
          </>}
      </li>;
    })}</ol>}</section>
    {canReply ? <section className={styles.composerPanel} aria-label="Write a reply">
      <form action={replyToThread} className={styles.composerForm}><input type="hidden" name="thread_id" value={thread.id} /><input type="hidden" name="thread_slug" value={thread.slug} />
        <label className="sr-only" htmlFor="reply-body">Your reply</label>
        <textarea className={styles.composerInput} id="reply-body" name="body" required maxLength={20000} rows={3} placeholder="Write a message…" />
        <button className={styles.composerSend} type="submit">Send</button>
      </form>
    </section> : !user ? <Notice tone="neutral">Sign in to reply or report a post. <Link className="ui-text-link" href={signIn}>Sign in</Link></Notice> : null}
  </PageFrame>;
}
