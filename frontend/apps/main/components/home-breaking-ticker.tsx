"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { HomeBreakingStory } from "../lib/home-data";
import { newsArticlePath } from "../lib/news-urls";
import styles from "./home-breaking-ticker.module.css";

function TickerBullet() {
  return <svg aria-hidden="true" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="6" r="4" /></svg>;
}

export function HomeBreakingTicker({stories,initialTime}:{stories:HomeBreakingStory[];initialTime:number}) {
 const [now,setNow]=useState(initialTime);
 const expiryKey=stories.map(s=>s.breaking_until).join("|");
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout> | undefined;
  const refresh=()=>{if(timer)clearTimeout(timer);const time=Date.now();setNow(time);const next=expiryKey.split("|").map(Date.parse).filter(n=>Number.isFinite(n)&&n>time).sort((a,b)=>a-b)[0];if(next!==undefined)timer=setTimeout(refresh,Math.min(next-time+1,2147483647));};
  refresh();document.addEventListener("visibilitychange",refresh);window.addEventListener("focus",refresh);
  return()=>{if(timer)clearTimeout(timer);document.removeEventListener("visibilitychange",refresh);window.removeEventListener("focus",refresh)};
 },[expiryKey]);
 const active=stories.filter(s=>s.breaking_until && Date.parse(s.breaking_until)>now);
 if(!active.length)return null;
 return <section className={`ep-container ${styles.banner}`} aria-label="Breaking news">
  <div className={styles.label}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10v4h4l10 5V5L7 10H3ZM7 14l2 6h3l-1.5-4.5M20 9v6"/></svg><span>Breaking news</span></div>
  <div className={styles.viewport}>
   <div className={styles.track}>
    <ul className={styles.items}>{active.map(story=><li key={story.slug}><TickerBullet /><Link href={newsArticlePath(story.slug)}>{story.title}</Link></li>)}</ul>
    <ul className={`${styles.items} ${styles.duplicate}`} aria-hidden="true">{active.map(story=><li key={story.slug}><TickerBullet /><Link href={newsArticlePath(story.slug)} tabIndex={-1}>{story.title}</Link></li>)}</ul>
   </div>
  </div>
 </section>;
}
