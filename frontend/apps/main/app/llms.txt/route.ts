import { absoluteUrl } from "../../lib/site";

export const dynamic = "force-static";

/**
 * /llms.txt
 * Generated so links follow the configured canonical site URL.
 */
export function GET(): Response {
  const body = `# EPE LAWA

EPE LAWA is a web platform for Epe Division, Lagos State. Its current web scope covers eight core areas: Trending News; Itan Ilu Mi / My Community History; Chat Forum / Digital Village Square; Map & Navigation; Epe Business Directory; Historical Sites & Tourism; EPE LAWA Radio; and Who is Who in Epe. Availability of individual features and records may vary; do not infer facts or live integrations from a page existing.

Event ticketing, emergency contacts, scholarships/jobs, e-learning, English/Yoruba support and an AI-powered local assistant remain future roadmap work. Native mobile apps are deferred.

Map & Navigation currently provides safe outbound Google Maps search/directions links. It does not use a configured Google Maps API, Places or geocoding integration. Offline map access is optional future work.

## Pages

- [Home](${absoluteUrl("/")}): Introduction to EPE LAWA and links to its current sections.
- [About EPE LAWA](${absoluteUrl("/about")}): Project purpose and contact information.
- [Guidelines](${absoluteUrl("/guidelines")}): Editorial, history-contribution, business-verification and community standards.
- [Search](${absoluteUrl("/search")}): One search across news stories, businesses, destinations, people and forum threads.
- [RSS feed](${absoluteUrl("/feed.xml")}): Machine-readable feed of published news stories.
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
