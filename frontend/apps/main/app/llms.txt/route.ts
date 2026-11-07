import { absoluteUrl } from "../../lib/site";

export const dynamic = "force-static";

/**
 * /llms.txt
 *
 * Generated rather than static: `public/llms.txt` hardcoded
 * `https://epelawa.vercel.app`, so the file disagreed with the canonical, sitemap
 * and robots output. Every URL here now comes from `lib/site.ts`.
 */
export function GET(): Response {
  const body = `# EPE LAWA

EPE LAWA is a website-first platform being prepared for Epe Division and people connected to it. News, radio and media are not connected yet.

## Pages

- [Home](${absoluteUrl("/")}): EPE LAWA's current introduction and service status.
- [About EPE LAWA](${absoluteUrl("/about")}): The project's aims and what is being prepared.
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
