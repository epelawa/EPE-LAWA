"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase";

export async function submitBusinessReview(form: FormData) {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fbusiness-directory");
  if (!user.email_confirmed_at) redirect("/business-directory?business_error=verify-email");

  const id = String(form.get("business_id") ?? "").trim();
  const rating = Number(String(form.get("rating") ?? ""));
  const body = String(form.get("body") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isInteger(rating) || rating < 1 || rating > 5 || body.length > 4000) {
    redirect("/business-directory?business_error=invalid-review");
  }

  const { error } = await db.from("business_reviews").insert({ business_id: id, author_id: user.id, rating, body: body || null });
  if (error) redirect(`/business-directory?business_error=${encodeURIComponent(error.code === "23505" ? "already-reviewed" : "review-unavailable")}`);
  revalidatePath("/business-directory");
  redirect("/business-directory?review=sent");
}
