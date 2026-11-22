"use server";

import { createClient } from "../../lib/supabase";

export type CommentVoteState = { voted: boolean; count: number };

export async function commentVoteToggle(commentId: string): Promise<CommentVoteState | null> {
  if (!/^[0-9a-f-]{36}$/i.test(commentId)) return null;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data, error } = await db.rpc("comment_vote_toggle", { p_comment_id: commentId });
  if (error || typeof data !== "boolean") return null;
  const { count } = await db.from("comment_votes").select("*", { count: "exact", head: true }).eq("comment_id", commentId);
  return { voted: data, count: count ?? 0 };
}
