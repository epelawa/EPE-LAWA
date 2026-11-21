"use client";

import { useRouter } from "next/navigation";
import { adminHref } from "../lib/admin-path";
import styles from "../app/(protected)/newsroom/newsroom-list.module.css";

export default function NewsroomFilter({ state }: { state: string }) {
  const router = useRouter();
  return <label className={styles.filter}><span className="sr-only">Filter articles by state</span><select value={state} onChange={(event) => {
    const value = event.currentTarget.value;
    router.push(adminHref(value ? `/newsroom?state=${encodeURIComponent(value)}` : "/newsroom"));
  }}><option value="">All articles</option><option value="draft">Unpublished</option><option value="review">Awaiting publish</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="published">Published</option></select></label>;
}
