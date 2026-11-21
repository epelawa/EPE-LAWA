"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase";
import { formRateAllowance, formRateLimitedMessage } from "../../lib/form-server";

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
};

function fail(message: string): never {
  redirect(`/forum?forum_error=${encodeURIComponent(message)}`);
}

async function memberClient(next = "/forum") {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}

export async function createThread(data: FormData) {
  if (!(await formRateAllowance("forum_post"))) fail(formRateLimitedMessage);
  const { supabase } = await memberClient("/forum/new");
  const categoryId = text(data, "category_id");
  const title = text(data, "title");
  const body = text(data, "body");
  const pollQuestion = text(data, "poll_question");
  const options = data.getAll("poll_option").map((value) => typeof value === "string" ? value.trim() : "").filter(Boolean);
  if (!categoryId || title.length < 3 || title.length > 160 || !body || body.length > 20000) fail("Check the category, title, and post text.");
  if (pollQuestion && (pollQuestion.length < 3 || pollQuestion.length > 300 || options.length < 2 || options.length > 10 || options.some((option) => option.length > 120) || new Set(options.map((option) => option.toLocaleLowerCase())).size !== options.length)) fail("A poll needs a question and 2–10 distinct options within the stated limits.");
  const { data: threadId, error } = await supabase.rpc("forum_create_thread", {
    p_category_id: categoryId,
    p_title: title,
    p_body: body,
    p_poll_question: pollQuestion || null,
    p_poll_options: pollQuestion ? options : null,
    p_poll_closes_at: null,
  });
  if (error || typeof threadId !== "string") fail("The thread could not be created. Your account may need an active member profile.");
  const { data: thread } = await supabase.from("forum_threads").select("slug").eq("id", threadId).maybeSingle();
  if (!thread?.slug) fail("The thread was created but its page could not be opened.");
  revalidatePath("/forum");
  redirect(`/forum/thread/${encodeURIComponent(thread.slug)}`);
}

export async function voteInPoll(data: FormData) {
  const slug = text(data, "thread_slug");
  const next = `/forum/thread/${slug}`;
  const { supabase } = await memberClient(next);
  const pollId = text(data, "poll_id");
  const optionId = text(data, "option_id");
  if (!slug || !pollId || !optionId) redirect(`${next}?forum_error=${encodeURIComponent("Choose one poll option.")}`);
  const { error } = await supabase.rpc("forum_vote", { p_poll_id: pollId, p_option_id: optionId });
  revalidatePath(next);
  if (error) redirect(`${next}?forum_error=${encodeURIComponent(error.message.includes("already_voted") ? "You have already voted in this poll." : "Your vote could not be recorded. The poll may be closed or your membership may be inactive.")}`);
  redirect(`${next}?voted=1`);
}

export async function replyToThread(data: FormData) {
  if (!(await formRateAllowance("forum_post"))) fail(formRateLimitedMessage);
  const { supabase, user } = await memberClient();
  const threadId = text(data, "thread_id");
  const slug = text(data, "thread_slug");
  const body = text(data, "body");
  if (!threadId || body.length < 1 || body.length > 20000) fail("Write a reply of up to 20,000 characters.");
  const { error } = await supabase.from("forum_posts").insert({ thread_id: threadId, author_id: user.id, body });
  if (error) fail("Your reply could not be posted. The thread may be locked or your membership may be inactive.");
  revalidatePath(`/forum/thread/${slug}`);
  redirect(`/forum/thread/${encodeURIComponent(slug)}?posted=1`);
}

export async function reportPost(data: FormData) {
  const { supabase, user } = await memberClient();
  const postId = text(data, "post_id");
  const slug = text(data, "thread_slug");
  const reason = text(data, "reason");
  const note = text(data, "note");
  const validReasons = ["spam", "harassment", "hate", "misinformation", "privacy", "other"];
  if (!postId || !validReasons.includes(reason) || note.length > 1000) fail("Choose a report reason and keep any note under 1,000 characters.");
  const { error } = await supabase.from("forum_reports").insert({ post_id: postId, reporter_id: user.id, reason, note: note || null });
  if (error) {
    const message = error.code === "23505" ? "You have already reported this post." : "The report could not be submitted. Active member access is required.";
    redirect(`/forum/thread/${encodeURIComponent(slug)}?forum_error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/forum/thread/${slug}`);
  redirect(`/forum/thread/${encodeURIComponent(slug)}?reported=1`);
}
