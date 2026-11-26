"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./floating-support.module.css";
import EnquiryForm from "./enquiry-form";
type Position = {x:number;y:number};
const key = "epelawa-support-position";
/* Short prompts that pop out of the support button a few times per browsing session. */
const BUBBLES = ["Need support?", "Need a human? We’re here.", "Got a question? Ask us.", "Something not working? Tell us.", "Talk to the EPE LAWA team."];
const BUBBLE_KEY = "epelawa-support-bubbles-seen";
const BUBBLE_FIRST_MS = 4000;
const BUBBLE_SHOW_MS = 2600;
const BUBBLE_GAP_MS = 9000;
const BUBBLE_MAX = 3;
function SupportAvatar({ eyesClassName }: { eyesClassName: string }) {
 return <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  <circle cx="16" cy="17" r="9.2" fill="#F1F4FA" />
  <path d="M6.6 16.5a9.4 9.4 0 0 1 18.8 0" fill="none" stroke="#0A1023" strokeWidth="2" strokeLinecap="round" />
  <rect x="4.4" y="14.6" width="4.2" height="7" rx="2.1" fill="#0A1023" />
  <rect x="23.4" y="14.6" width="4.2" height="7" rx="2.1" fill="#0A1023" />
  <path d="M25.5 21.4c0 2.9-2.4 4.6-5.6 4.6" fill="none" stroke="#0A1023" strokeWidth="1.6" strokeLinecap="round" />
  <circle cx="18.8" cy="26" r="1.5" fill="#0A1023" />
  <g className={eyesClassName}><circle cx="13.1" cy="16.4" r="1.55" fill="#0A1023" /><circle cx="18.9" cy="16.4" r="1.55" fill="#0A1023" /></g>
  <path d="M13 20.4q3 2.3 6 0" fill="none" stroke="#0A1023" strokeWidth="1.5" strokeLinecap="round" />
 </svg>;
}
export default function FloatingSupport({ href = "/support", privacyHref = "/privacy", enabled = false }: { href?: string; privacyHref?: string; enabled?: boolean }) {
 const [position,setPosition]=useState<Position | null>(null);
 const box=useRef<HTMLDivElement>(null);
 const opener=useRef<HTMLButtonElement>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const [pending,setPending]=useState(false);
 const drag=useRef<{id:number;dx:number;dy:number} | null>(null);
 const [bubble,setBubble]=useState<number | null>(null);
 const [bubbleBelow,setBubbleBelow]=useState(false);
 const quietRef=useRef(false);
 // A few short prompts per session: none under reduced motion, never while the dialog is open, and
 // never again once the reader has interacted with the button (WCAG 2.2.2: brief and self-stopping).
 useEffect(()=>{
  if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try { if (sessionStorage.getItem(BUBBLE_KEY)) return; } catch { /* storage may be unavailable */ }
  const timers:number[]=[]; let shown=0; const first=Math.floor(Math.random()*BUBBLES.length);
  const schedule=(delay:number)=>{timers.push(window.setTimeout(()=>{
   if (quietRef.current) return;
   const notice=document.querySelector(".storage-notice");
   if (document.hidden || dialog.current?.open || (notice && window.innerWidth < 768)) { schedule(BUBBLE_GAP_MS); return; }
   setBubbleBelow((box.current?.getBoundingClientRect().top ?? 200) < 90);
   setBubble((first+shown)%BUBBLES.length); shown+=1;
   timers.push(window.setTimeout(()=>setBubble(null),BUBBLE_SHOW_MS));
   if (shown<BUBBLE_MAX) schedule(BUBBLE_SHOW_MS+BUBBLE_GAP_MS); else { try { sessionStorage.setItem(BUBBLE_KEY,"1"); } catch { /* optional */ } }
  },delay));};
  schedule(BUBBLE_FIRST_MS);
  return ()=>timers.forEach((id)=>window.clearTimeout(id));
 },[]);
 function quiet(){ if (quietRef.current) return; quietRef.current=true; setBubble(null); try { sessionStorage.setItem(BUBBLE_KEY,"1"); } catch { /* optional */ } }
 function clamp(p:Position):Position {const r=box.current?.getBoundingClientRect();return {x:Math.max(0,Math.min(p.x,window.innerWidth-(r?.width ?? 130))),y:Math.max(0,Math.min(p.y,window.innerHeight-(r?.height ?? 48)))};}
 useEffect(()=>{
  try {const value=JSON.parse(localStorage.getItem(key) ?? "null");if(value && Number.isFinite(value.x) && Number.isFinite(value.y)) setPosition(clamp(value));} catch { /* storage may be unavailable */ }
  const resize=()=>setPosition(p=>p ? clamp(p) : p); window.addEventListener("resize",resize);return()=>window.removeEventListener("resize",resize);
 },[]);
 function save(p:Position){setPosition(p);try{localStorage.setItem(key,JSON.stringify(p));}catch{/* optional preference */}}
 return <div ref={box} className={styles.widget} data-talking={bubble!==null ? "true" : undefined} style={position ? {left:position.x,top:position.y,right:"auto",bottom:"auto"} : undefined} onPointerEnter={(e)=>{if(e.pointerType==="mouse")quiet();}} onFocusCapture={quiet}>
  <p className={styles.bubble} data-visible={bubble!==null ? "true" : "false"} data-below={bubbleBelow ? "true" : undefined} aria-hidden="true">{bubble!==null ? BUBBLES[bubble] : ""}</p>
  <button type="button" className={styles.handle} aria-label="Move support button. Use arrow keys or drag." onPointerDown={e=>{const r=box.current?.getBoundingClientRect();if(!r)return;drag.current={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current?.id===e.pointerId)setPosition(clamp({x:e.clientX-drag.current.dx,y:e.clientY-drag.current.dy}));}} onPointerUp={e=>{if(drag.current?.id!==e.pointerId)return;const p=clamp({x:e.clientX-drag.current.dx,y:e.clientY-drag.current.dy});drag.current=null;save(p);}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={e=>{const delta:Record<string,Position>={ArrowLeft:{x:-20,y:0},ArrowRight:{x:20,y:0},ArrowUp:{x:0,y:-20},ArrowDown:{x:0,y:20}};const d=delta[e.key];if(!d)return;e.preventDefault();const r=box.current?.getBoundingClientRect();if(r)save(clamp({x:r.left+d.x,y:r.top+d.y}));}}><svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" fill="currentColor"><circle cx="5.5" cy="3.5" r="1.4"/><circle cx="10.5" cy="3.5" r="1.4"/><circle cx="5.5" cy="8" r="1.4"/><circle cx="10.5" cy="8" r="1.4"/><circle cx="5.5" cy="12.5" r="1.4"/><circle cx="10.5" cy="12.5" r="1.4"/></svg></button>
  <noscript><a className={styles.link} href={href}>Support</a></noscript>
  <button ref={opener} type="button" className={styles.link} aria-haspopup="dialog" onClick={()=>{quiet();dialog.current?.showModal();}}><span className={styles.avatar} aria-hidden="true"><SupportAvatar eyesClassName={styles.eyes} /></span><span className={styles.label}>Support</span></button>
  <dialog ref={dialog} className={styles.modal} aria-labelledby="support-dialog-title" aria-describedby="support-dialog-description" onCancel={e=>{if(pending)e.preventDefault();}} onClose={()=>opener.current?.focus()}>
   <div className={styles.modalHeader}><div><p className={styles.eyebrow}>EPE LAWA · SUPPORT</p><h2 id="support-dialog-title">How can we help?</h2><p id="support-dialog-description">Tell us what happened and we’ll send your request to our team.</p></div><button type="button" className={styles.close} aria-label="Close support" disabled={pending} onClick={()=>dialog.current?.close()}>×</button></div>
   <div className={styles.modalBody}>{enabled ? <><p className={styles.hint}>Please don’t include passwords, payment details or other sensitive information.</p><EnquiryForm kind="support" privacyHref={privacyHref} onPendingChange={setPending} /></> : <p role="status">Support requests are temporarily unavailable. Please check back later; no request can be submitted now.</p>}<p className={styles.fallback}>Prefer a full page? <a href={href}>Open support page</a></p></div>
  </dialog>
 </div>;
}
