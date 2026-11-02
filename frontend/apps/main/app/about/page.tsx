import type { Metadata } from "next";
import Link from "next/link";

const description = "Learn about EPE LAWA's vision for community journalism, broadcasting and cultural storytelling for Epe Division and its diaspora, and what is being prepared.";
export const metadata: Metadata = {
  title: "About",
  description,
  alternates: { canonical: "/about" },
  openGraph: { title: "About EPE LAWA", description, url: "/about", type: "website", images: [{ url: "/share.png", width: 1200, height: 630, alt: "EPE LAWA — The Voice of Epe Division" }] },
  twitter: { card: "summary_large_image", title: "About EPE LAWA", description, images: ["/share.png"] },
};

export default function About() {
  return (
    <main>
      <p className="eyebrow">EPE LAWA</p>
      <h1>About EPE LAWA</h1>
      <p>EPE LAWA is a website-first platform being built for Epe Division and people connected to it, at home and around the world.</p>
      <h2>Our direction</h2>
      <p>Our aim is to inform, connect, empower and represent the community through journalism, broadcasting and cultural storytelling. The project is intended to make public-interest information easier to find and use.</p>
      <h2>What is being prepared?</h2>
      <p>We are preparing a main website, a distinct news publication and a media experience. News articles, radio and media are not connected yet. A working authorised live radio stream is a requirement for launch.</p>
      <p>Community participation and local discovery are part of the longer-term vision, not available services today.</p>
      <p><Link href="/">Return to the homepage</Link></p>
    </main>
  );
}
