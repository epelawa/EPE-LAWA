import { createClient } from "../../lib/supabase";
import { formatPublishedDate } from "../../lib/dates";
import BanAppealForm from "./ban-appeal-form";
import styles from "./dashboard.module.css";

type BanRow = { id: string; reason: string; issued_at: string; expires_at: string | null; revoked_at: string | null };
type AppealRow = { id: string; resource_type: string; action_id: string; status: string; decision_note: string | null; created_at: string; updated_at: string };

const statusLabel: Record<string, string> = {
  open: "Awaiting review",
  granted: "Granted",
  denied: "Denied",
};

export default async function AppealsPanel() {
  let bans: BanRow[] = [];
  let appeals: AppealRow[] = [];
  let unavailable = false;
  try {
    const supabase = await createClient();
    const [banResult, appealResult] = await Promise.all([
      supabase
        .from("member_bans")
        .select("id,reason,issued_at,expires_at,revoked_at")
        .is("revoked_at", null)
        .order("issued_at", { ascending: false })
        .limit(1),
      supabase
        .from("moderation_appeals")
        .select("id,resource_type,action_id,status,decision_note,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (banResult.error || appealResult.error) unavailable = true;
    else {
      bans = (banResult.data ?? []) as BanRow[];
      appeals = (appealResult.data ?? []) as AppealRow[];
    }
  } catch {
    unavailable = true;
  }

  if (unavailable) {
    return <section className={styles.panel} aria-labelledby="appeals-title">
      <h2 id="appeals-title">Appeals</h2>
      <p className={styles.error} role="alert">Your appeal records could not be loaded right now. Nothing is being guessed or substituted.</p>
    </section>;
  }

  const ban = bans[0] ?? null;
  const openBanAppeal = ban ? appeals.find((row) => row.resource_type === "member_ban" && row.action_id === ban.id && row.status === "open") : undefined;

  return <section className={styles.panel} aria-labelledby="appeals-title">
    <h2 id="appeals-title">Appeals</h2>
    {ban ? (
      openBanAppeal ? (
        <p className={styles.helper}>Your appeal against the ban issued {formatPublishedDate(ban.issued_at) ?? ""} is open. A moderation decision will appear here and in your notifications.</p>
      ) : (
        <>
          <p className={styles.helper}>Your account is currently banned. If you believe this decision is wrong, you can appeal it once. A staff moderator will grant or deny the appeal with a written answer.</p>
          <BanAppealForm banId={ban.id} reason={ban.reason} />
        </>
      )
    ) : appeals.length === 0 ? (
      <p className={styles.helper}>Nothing to appeal. If a moderator ever restricts your account, you can appeal that decision here once, in writing.</p>
    ) : null}
    {appeals.length ? (
      <ul className={styles.savedGrid}>
        {appeals.map((appeal) => <li key={appeal.id} className={styles.savedItem}>
          <span className={styles.savedCopy}>
            <span className={styles.savedTitle}>{statusLabel[appeal.status] ?? appeal.status}</span>
            <span className={styles.savedMeta}>Appeal opened {formatPublishedDate(appeal.created_at) ?? ""} · {appeal.resource_type === "member_ban" ? "account ban" : "content moderation"}</span>
            {appeal.status !== "open" && appeal.decision_note ? <span className={styles.savedMeta}>Decision: {appeal.decision_note}</span> : null}
          </span>
        </li>)}
      </ul>
    ) : null}
  </section>;
}
