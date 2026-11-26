import { humanCheckMode, issueHumanChallenge } from "../../../lib/human-check";

export const dynamic = "force-dynamic";

/** Issues a signed challenge for components/human-check.tsx. Holds no state and stores nothing. */
export function GET(): Response {
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
  const mode = humanCheckMode();
  if (mode !== "own") return Response.json({ mode }, { headers });
  const challenge = issueHumanChallenge();
  return challenge ? Response.json({ mode, ...challenge }, { headers }) : Response.json({ mode: "off" }, { headers });
}
