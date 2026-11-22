import Link from "next/link";
import { createClient } from "../lib/supabase";
import type { FollowTopicType } from "../app/follow-actions";
import FollowToggle from "./follow-toggle";

export default async function FollowButton({
  topicType,
  topicId,
  returnTo,
}: {
  topicType: FollowTopicType;
  topicId: string;
  returnTo: string;
}) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return <Link className="btn-secondary" href={`/login?next=${encodeURIComponent(returnTo)}`}>Follow topic</Link>;
  }
  const { data: existing } = await db.from("topic_follows")
    .select("topic_id")
    .eq("user_id", user.id)
    .eq("topic_type", topicType)
    .eq("topic_id", topicId)
    .maybeSingle();
  return <FollowToggle topicType={topicType} topicId={topicId} initialFollowing={Boolean(existing)} />;
}
