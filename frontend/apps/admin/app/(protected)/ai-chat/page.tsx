import type { Metadata } from "next";
import Link from "../../../components/admin-link";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, StatusBadge, SubmitButton, buttonClassName } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { adminHref } from "../../../lib/admin-path";
import { cancelAdminChatAction, clearAdminChat, confirmAdminChatAction, sendAdminChat } from "../../../lib/ai-chat-actions";
import { CONFIRM_ABOVE_ITEMS, CONFIRM_EXPIRES_MINUTES } from "../../../lib/ai-chat-plan";
import { formAdminClient } from "../../../../main/lib/form-server";
import styles from "./ai-chat.module.css";

export const metadata: Metadata = { title: "AI chat", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// The AI may take a while to answer on the free models.
export const maxDuration = 60;

type Message = { id: string; role: "admin" | "ai"; content: string; action_id: string | null; model: string | null; created_at: string };
type Action = { id: string; status: string; needs_confirm: boolean; created_at: string };

const RESULTS: Record<string, { tone: "neutral" | "success" | "warning" | "danger"; text: string }> = {
  denied: { tone: "danger", text: "Only the primary administrators can use the AI chat." },
  empty: { tone: "warning", text: "Type an instruction or a question first." },
  unavailable: { tone: "danger", text: "The AI chat is unavailable right now (server key missing). Nothing was changed." },
  stale: { tone: "warning", text: "That plan was already confirmed, cancelled or expired." },
  cleared: { tone: "neutral", text: "The conversation was cleared. Pending plans were cancelled." },
};

const EXAMPLES = [
  "Unpublish and delete all articles",
  "Edit article 1A2B3C4D: make the headline shorter",
  "Reply to EPE-AB12CD to say we have fixed it, and mark it resolved",
  "Which drafts are waiting to be published?",
];

const time = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit", hour12: true, day: "numeric", month: "short" });

/** Admin ↔ AI chat (owner brief, turn 26): primary administrators only, Epe Division content only. */
export default async function AiChatPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const db = await createStaffClient();
  const access = await db.rpc("staff_roles_authorized");
  if (access.error || access.data !== true) {
    return <PageFrame><PageIntro eyebrow="System · AI" title="AI chat" description="Talk to the AI about articles and support tickets." />
      <EmptyPanel title={access.error ? "Access could not be verified" : "Primary administrators only"} description="The AI chat is restricted to the primary administrators." actions={<Link href={adminHref("/")}>Back to dashboard</Link>} />
    </PageFrame>;
  }
  const { result } = await searchParams;
  const { data: auth } = await db.auth.getUser();
  let messages: Message[] = [];
  let actions = new Map<string, Action>();
  let loadFailed = false;
  try {
    const svc = formAdminClient();
    const read = await svc.from("ai_admin_chat_messages").select("id,role,content,action_id,model,created_at").eq("admin_id", auth.user?.id ?? "").order("created_at", { ascending: false }).limit(60);
    if (read.error) loadFailed = true;
    messages = ((read.data ?? []) as Message[]).reverse();
    const ids = [...new Set(messages.map((message) => message.action_id).filter((id): id is string => Boolean(id)))];
    if (ids.length) {
      const acts = await svc.from("ai_admin_chat_actions").select("id,status,needs_confirm,created_at").in("id", ids);
      actions = new Map(((acts.data ?? []) as Action[]).map((action) => [action.id, action]));
    }
  } catch {
    loadFailed = true;
  }
  // Only the newest message tied to a pending plan shows the Confirm button.
  const lastForAction = new Map<string, string>();
  for (const message of messages) if (message.action_id) lastForAction.set(message.action_id, message.id);
  const notice = result ? RESULTS[result] : undefined;

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="System · AI" title="AI chat" description={<>Ask the AI to work on EPE LAWA&apos;s articles (by article ID, shown in the <Link href={adminHref("/newsroom")} className="ui-text-link">newsroom</Link>) and support tickets (by number, EPE-XXXXXX). Epe Division content only. Edits and replies run straight away; deletes and anything touching more than {CONFIRM_ABOVE_ITEMS} items wait for your Confirm. The AI never publishes.</>}
      actions={messages.length ? <form action={clearAdminChat}><SubmitButton className={buttonClassName("secondary")} pendingLabel="Clearing…">Clear conversation</SubmitButton></form> : undefined} />
    {notice ? <Notice tone={notice.tone} role={notice.tone === "danger" ? "alert" : "status"}>{notice.text}</Notice> : null}
    {loadFailed ? <Notice tone="danger" role="alert">The conversation could not be loaded. Sending still works.</Notice> : null}
    <Panel className={styles.chat}>
      <ol className={styles.log} aria-label="Conversation with the AI">
        {!messages.length ? <li className={`${styles.bubble} ${styles.ai}`}>Hello! I can unpublish, delete or edit articles by ID, and reply to or update support tickets by number — for Epe Division content only. What would you like to do?</li> : null}
        {messages.map((message) => {
          const action = message.action_id ? actions.get(message.action_id) : undefined;
          const pending = action?.status === "pending" && lastForAction.get(action.id) === message.id;
          const expired = pending && Date.now() - Date.parse(action.created_at) > CONFIRM_EXPIRES_MINUTES * 60_000;
          return <li key={message.id} className={`${styles.bubble} ${message.role === "admin" ? styles.me : styles.ai}`}>
            <span className={styles.who}>{message.role === "admin" ? "You" : "AI"} · <time dateTime={message.created_at}>{time.format(new Date(message.created_at))}</time>{message.model ? <> · <span className={styles.model}>{message.model}</span></> : null}</span>
            <span className={styles.text}>{message.content}</span>
            {pending && !expired ? <span className={styles.confirm}>
              <form action={confirmAdminChatAction}><input type="hidden" name="actionId" value={action.id} /><SubmitButton className={buttonClassName("danger")} pendingLabel="Running…">Confirm</SubmitButton></form>
              <form action={cancelAdminChatAction}><input type="hidden" name="actionId" value={action.id} /><SubmitButton className={buttonClassName("secondary")} pendingLabel="Cancelling…">Cancel</SubmitButton></form>
            </span> : null}
            {expired ? <StatusBadge tone="warning">Expired — ask again</StatusBadge> : null}
            {action && !pending && action.needs_confirm && message.role === "ai" && lastForAction.get(action.id) === message.id && action.status !== "pending" ? <StatusBadge tone={action.status === "done" ? "success" : action.status === "cancelled" || action.status === "expired" ? "neutral" : "warning"}>{action.status}</StatusBadge> : null}
          </li>;
        })}
      </ol>
      <span id="latest" />
      <form action={sendAdminChat} className={styles.form}>
        <label htmlFor="ai-chat-message" className="sr-only">Message to the AI</label>
        <textarea id="ai-chat-message" name="message" className="input" rows={3} minLength={2} maxLength={2000} required placeholder="e.g. Unpublish article 1A2B3C4D, or reply to EPE-AB12CD…" />
        <SubmitButton pendingLabel="The AI is working…">Send</SubmitButton>
      </form>
      {!messages.length ? <div className={styles.examples}><span className="ui-meta">Try:</span>{EXAMPLES.map((example) => <code key={example}>{example}</code>)}</div> : null}
    </Panel>
  </PageFrame>;
}
