"use client";
import { useState } from "react";
export function CopyConfigName({ name }: { name: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(name); setMessage("Copied"); }
    catch { setMessage("Copy unavailable; select the name instead."); }
  }
  return <span><button type="button" className="btn-secondary" onClick={copy} aria-label={`Copy ${name}`}>Copy name</button> <span role="status" aria-live="polite">{message}</span></span>;
}
