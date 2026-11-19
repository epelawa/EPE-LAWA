"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./floating-support.module.css";
import EnquiryForm from "./enquiry-form";
type Position = {x:number;y:number};
const key = "epelawa-support-position";
export default function FloatingSupport({ href = "/support", privacyHref = "/privacy", enabled = false }: { href?: string; privacyHref?: string; enabled?: boolean }) {
 const [position,setPosition]=useState<Position | null>(null);
 const box=useRef<HTMLDivElement>(null);
 const opener=useRef<HTMLButtonElement>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const [pending,setPending]=useState(false);
 const drag=useRef<{id:number;dx:number;dy:number} | null>(null);
 function clamp(p:Position):Position {const r=box.current?.getBoundingClientRect();return {x:Math.max(0,Math.min(p.x,window.innerWidth-(r?.width ?? 130))),y:Math.max(0,Math.min(p.y,window.innerHeight-(r?.height ?? 48)))};}
 useEffect(()=>{
  try {const value=JSON.parse(localStorage.getItem(key) ?? "null");if(value && Number.isFinite(value.x) && Number.isFinite(value.y)) setPosition(clamp(value));} catch { /* storage may be unavailable */ }
  const resize=()=>setPosition(p=>p ? clamp(p) : p); window.addEventListener("resize",resize);return()=>window.removeEventListener("resize",resize);
 },[]);
 function save(p:Position){setPosition(p);try{localStorage.setItem(key,JSON.stringify(p));}catch{/* optional preference */}}
 return <div ref={box} className={styles.widget} style={position ? {left:position.x,top:position.y,right:"auto",bottom:"auto"} : undefined}>
  <button type="button" className={styles.handle} aria-label="Move support button. Use arrow keys or drag." onPointerDown={e=>{const r=box.current?.getBoundingClientRect();if(!r)return;drag.current={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current?.id===e.pointerId)setPosition(clamp({x:e.clientX-drag.current.dx,y:e.clientY-drag.current.dy}));}} onPointerUp={e=>{if(drag.current?.id!==e.pointerId)return;const p=clamp({x:e.clientX-drag.current.dx,y:e.clientY-drag.current.dy});drag.current=null;save(p);}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={e=>{const delta:Record<string,Position>={ArrowLeft:{x:-20,y:0},ArrowRight:{x:20,y:0},ArrowUp:{x:0,y:-20},ArrowDown:{x:0,y:20}};const d=delta[e.key];if(!d)return;e.preventDefault();const r=box.current?.getBoundingClientRect();if(r)save(clamp({x:r.left+d.x,y:r.top+d.y}));}}>⠿</button>
  <noscript><a className={styles.link} href={href}>Support</a></noscript>
  <button ref={opener} type="button" className={styles.link} aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}>Support</button>
  <dialog ref={dialog} className={styles.modal} aria-labelledby="support-dialog-title" aria-describedby="support-dialog-description" onCancel={e=>{if(pending)e.preventDefault();}} onClose={()=>opener.current?.focus()}>
   <div className={styles.modalHeader}><div><p className={styles.eyebrow}>EPE LAWA · SUPPORT</p><h2 id="support-dialog-title">How can we help?</h2><p id="support-dialog-description">Tell us what happened and we’ll send your request to our team.</p></div><button type="button" className={styles.close} aria-label="Close support" disabled={pending} onClick={()=>dialog.current?.close()}>×</button></div>
   <div className={styles.modalBody}>{enabled ? <><p className={styles.hint}>Please don’t include passwords, payment details or other sensitive information.</p><EnquiryForm kind="support" privacyHref={privacyHref} onPendingChange={setPending} /></> : <p role="status">Support requests are temporarily unavailable. Please check back later; no request can be submitted now.</p>}<p className={styles.fallback}>Prefer a full page? <a href={href}>Open support page</a></p></div>
  </dialog>
 </div>;
}
