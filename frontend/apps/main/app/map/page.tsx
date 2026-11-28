import type { Metadata } from "next";
import MapAssistant from "./map-assistant";

export const metadata: Metadata = {
  title: "Map & Navigation",
  description: "Ask the EPE LAWA directions assistant about streets, landmarks and routes in Epe Division. Answers pin the destination on Google Maps right below the reply.",
  alternates: { canonical: "/map" },
};

/**
 * Find-your-way (owner brief, 2026-11-28): the page IS the assistant chat.
 * No map opens on arrival, no suggestion chips, and no manual tools here —
 * corrections and manual directions live on /map/contribute.
 */
export default function MapPage() {
  return <MapAssistant />;
}
