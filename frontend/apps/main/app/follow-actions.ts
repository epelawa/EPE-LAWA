"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase";

export type FollowTopicType = "news_category" | "forum_category";
export type FollowState = { following: boolean };

export async function followTopicToggle(topicType: FollowTopicType, topicId: string): Promise<FollowState | null> {
  if (topicType !== "news_category" && topicType !== "forum_category") return null;
  if (!/^[0-9a-f-]{36}$/i.test(topicId)) return null;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data, error } = await db.rpc("topic_follow_toggle", { p_topic_type: topicType, p_topic_id: topicId });
  if (error || typeof data !== "boolean") return null;
  if (topicType === "news_category") revalidatePath("/news");
  else revalidatePath("/forum");
  return { following: data };
}
