"use client";

export default function BusinessContactLinks({ slug, phone, whatsappHref, website, address }: { slug: string; phone: string | null; whatsappHref: string | null; website: string | null; address: string | null }) {
  const track = (kind: string) => {
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
  const mapsHref = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  return <>
    {phone ? <a className="btn-primary" href={`tel:${phone}`} onClick={() => track("call")}>Call {phone}</a> : null}
    {whatsappHref ? <a className="btn-secondary" href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp")}>Chat on WhatsApp</a> : null}
    {website ? <a className="btn-ghost" href={website} target="_blank" rel="noopener noreferrer" onClick={() => track("website")}>Visit website <span aria-hidden="true">↗</span></a> : null}
    {mapsHref ? <a className="btn-ghost" href={mapsHref} target="_blank" rel="noopener noreferrer" onClick={() => track("directions")}>Get directions <span aria-hidden="true">↗</span></a> : null}
  </>;
}
