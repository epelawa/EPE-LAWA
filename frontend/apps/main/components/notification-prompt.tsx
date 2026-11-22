"use client";

import { useEffect, useState } from "react";
import { VAPID_PUBLIC_KEY, WEB_PUSH_READY } from "../lib/vapid";
import { createClient } from "../lib/supabase.client";

/**
 * Notification opt-in popup.
 *
 * Asks a signed-in member for permission to send push notifications about new
 * articles, radio programmes and community updates. Stores consent so it only
 * shows once, and never asks anonymous visitors — a subscription belongs to a
 * member and cannot exist without one.
 */
export default function NotificationPrompt() {
  const [show, setShow] = useState(true);
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!WEB_PUSH_READY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setShow(false);
        return;
      }
      const stored = localStorage.getItem("epelawa_notification_consent");
      if (stored !== null) {
        setShow(false);
        setGranted(stored === "true");
        return;
      }
      try {
        const { data } = await createClient().auth.getUser();
        setShow(!cancelled && data?.user != null && "Notification" in window);
      } catch {
        setShow(false);
      }
    })().catch(() => setShow(false));
    return () => { cancelled = true; };
  }, []);

  const grant = async () => {
    if (!WEB_PUSH_READY) {
      setShow(false);
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      const allowed = permission === "granted";
      localStorage.setItem("epelawa_notification_consent", String(allowed));
      setGranted(allowed);
      setShow(false);

      if (allowed && "serviceWorker" in navigator && "PushManager" in window) {
        const registration = await navigator.serviceWorker.register(
          "/sw.js",
          { scope: "/" }
        );
        // Re-use an existing subscription so re-visits do not pile up endpoints.
        const existing = await registration.pushManager.getSubscription();
        const subscription = existing ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as PushSubscriptionOptionsInit["applicationServerKey"],
        });
        const saved = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription }),
        });
        if (!saved.ok) throw new Error("subscription store refused");
      }
    } catch (err) {
      console.error("Notification permission error:", err);
      setGranted(false);
      setShow(false);
    }
  };

  const deny = () => {
    localStorage.setItem("epelawa_notification_consent", "false");
    setGranted(false);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border shadow-lg">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-muted-foreground leading-relaxed">
            Get notified when new articles and radio programmes are published.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-sm text-white bg-primary px-4 py-2 rounded-md hover:opacity-90 transition-colors"
              onClick={grant}
            >
              Allow notifications
            </button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary"
              onClick={deny}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
