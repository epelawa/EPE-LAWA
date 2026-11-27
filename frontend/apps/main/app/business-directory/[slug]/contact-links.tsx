"use client";

import { ChatIcon, GlobeIcon, PhoneIcon, RouteIcon } from "../../../components/business/business-icons";
import styles from "./profile.module.css";

type Kind = "call" | "whatsapp" | "website" | "directions";

/**
 * Contact actions for one listing. Every href is computed on the server from stored data
 * (lib/business-directory.ts); a missing or invalid value means no button, never a dead one.
 * WhatsApp leads when the listing has a valid WhatsApp number, otherwise Call leads.
 */
export default function BusinessContactLinks({ slug, name, phone, phoneHref, whatsappHref, website, directionsHref }: { slug: string; name: string; phone: string | null; phoneHref: string | null; whatsappHref: string | null; website: string | null; directionsHref: string | null }) {
  const track = (kind: Kind) => {
    try {
      const payload = JSON.stringify({ slug, kind });
      if (typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/business-directory/track", new Blob([payload], { type: "application/json" }));
      } else {
        void fetch("/api/business-directory/track", { method: "POST", body: payload, headers: { "content-type": "application/json" }, keepalive: true });
      }
    } catch {
      // Tracking is best-effort; the contact action itself must never be blocked.
    }
    return true;
  };
  const callLeads = !whatsappHref;
  return <div className={styles.actions}>
    {whatsappHref ? <a className={`${styles.action} ${styles.actionPrimary}`} href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp")}><ChatIcon />Chat on WhatsApp<span className="sr-only"> with {name} (opens WhatsApp)</span></a> : null}
    {phoneHref ? <a className={`${styles.action} ${callLeads ? styles.actionPrimary : ""}`} href={phoneHref} onClick={() => track("call")}><PhoneIcon />Call business<span className="sr-only"> {phone}</span></a> : null}
    {website ? <a className={styles.action} href={website} target="_blank" rel="noopener noreferrer" onClick={() => track("website")}><GlobeIcon />Visit website<span className="sr-only"> (opens in a new tab)</span></a> : null}
    {directionsHref ? <a className={styles.action} href={directionsHref} target="_blank" rel="noopener noreferrer" onClick={() => track("directions")}><RouteIcon />Get directions<span className="sr-only"> (opens Google Maps)</span></a> : null}
  </div>;
}
