import { headers } from "next/headers";
import { jsonLdScript } from "../lib/structured-data";

/** Server-only JSON-LD emission. Nonce comes from the CSP middleware. */
export default async function StructuredData({ data }: { data: object[] }) {
  if (!data.length) return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      {data.map((entry, index) => (
        <script
          key={index}
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: jsonLdScript(entry) }}
        />
      ))}
    </>
  );
}
