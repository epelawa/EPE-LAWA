import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main>
      <Image src="/brand-logo.png" alt="EPE LAWA logo" width={1348} height={1167} className="brand-logo" priority />
      <p className="eyebrow">EPE LAWA</p>
      <h1>The Voice of Epe Division</h1>
      <p>The website is being prepared. News, radio and media are not connected yet.</p>
      <p><Link href="/about">About EPE LAWA</Link></p>
      <h2>What we are building</h2>
      <p>EPE LAWA aims to connect people to community journalism, broadcasting and cultural storytelling about Epe Division, whether they live locally or are connected from abroad.</p>
      <p>News and media will be shared when the services and approved content are ready. Live radio is planned for launch, subject to an authorised stream and successful testing.</p>
    </main>
  );
}
