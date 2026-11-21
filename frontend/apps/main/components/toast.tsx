"use client";

import { useEffect, useState } from "react";

export type ToastTone = "success" | "error" | "info";
export type ToastPayload = { tone: ToastTone; message: string };
export type ToastItem = ToastPayload & { id: number };

export function pushToast(tone: ToastTone, message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastPayload>("ep-toast", { detail: { tone, message } }));
}

export default function ToastRegion() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail;
      if (!detail?.message) return;
      const toast: ToastItem = { ...detail, id: Date.now() + Math.random() };
      setToasts(current => [...current.slice(-2), toast]);
      window.setTimeout(() => setToasts(current => current.filter(t => t.id !== toast.id)), 4500);
    };
    window.addEventListener("ep-toast", onToast);
    return () => window.removeEventListener("ep-toast", onToast);
  }, []);
  if (!toasts.length) return null;
  return <div className="toast-region" aria-live="polite" role="status">
    {toasts.map(toast => <div key={toast.id} className={`toast toast--${toast.tone}`}>{toast.message}</div>)}
  </div>;
}
