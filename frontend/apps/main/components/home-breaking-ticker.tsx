"use client";
import { useEffect, useRef, useState } from "react";
import type { HomeBreakingStory } from "../lib/home-data";
import { BreakingTicker } from "./breaking-ticker";


export function HomeBreakingTicker({stories: initialStories,initialTime}:{stories:HomeBreakingStory[];initialTime:number}) {
 const [stories,setStories]=useState(initialStories);
 const [now,setNow]=useState(initialTime);
 const [arrived,setArrived]=useState(false);
 const storiesRef=useRef(initialStories);
 storiesRef.current=stories;
 const expiryKey=stories.map(s=>s.breaking_until).join("|");
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout> | undefined;
  const refresh=()=>{if(timer)clearTimeout(timer);const time=Date.now();setNow(time);const next=expiryKey.split("|").map(Date.parse).filter(n=>Number.isFinite(n)&&n>time).sort((a,b)=>a-b)[0];if(next!==undefined)timer=setTimeout(refresh,Math.min(next-time+1,2147483647));};
  refresh();document.addEventListener("visibilitychange",refresh);window.addEventListener("focus",refresh);
  return()=>{if(timer)clearTimeout(timer);document.removeEventListener("visibilitychange",refresh);window.removeEventListener("focus",refresh)};
 },[expiryKey]);
 useEffect(()=>{
  let alive=true;let timer:ReturnType<typeof setTimeout>;
  const poll=async()=>{
   try{
    const response=await fetch("/api/live/home",{cache:"no-store"});
    if(response.ok&&alive){
     const data=await response.json();
     if(data?.breaking?.state==="ok"&&Array.isArray(data.breaking.items)){
      const known=new Set(storiesRef.current.map((s:HomeBreakingStory)=>s.slug));
      const fresh=(data.breaking.items as HomeBreakingStory[]).filter(s=>!known.has(s.slug));
      if(fresh.length){setStories(current=>[...current,...fresh]);setArrived(true);window.setTimeout(()=>setArrived(false),4000);}
     }
    }
   }catch{}
   if(alive)timer=setTimeout(poll,60000);
  };
  timer=setTimeout(poll,60000);
  return()=>{alive=false;clearTimeout(timer);};
 },[]);
 const active=stories.filter(s=>s.breaking_until && Date.parse(s.breaking_until)>now);
 // Newest first, so a story that just broke leads the strip.
 active.sort((a,b)=>Date.parse(b.published_at ?? "")-Date.parse(a.published_at ?? "") || 0);
 if(!active.length)return null;
 return <div className="ep-container"><BreakingTicker stories={active} arrived={arrived} /></div>;
}
