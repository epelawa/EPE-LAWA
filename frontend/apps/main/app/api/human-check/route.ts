import { SIGNIN_DIFFICULTY, humanCheckMode, issueHumanChallenge } from "../../../lib/human-check";

export const dynamic = "force-dynamic";

/**
 * Issues a signed challenge for components/human-check.tsx. Holds no state and stores nothing.
 * `?for=signin` issues the harder sign-in challenge (each solve is good for one password check).
 */
export function GET(request: Request): Response {
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
  const mode = humanCheckMode();
  if (mode !== "own") return Response.json({ mode }, { headers });
  const signin = new URL(request.url).searchParams.get("for") === "signin";
  const challenge = signin ? issueHumanChallenge(Date.now(), SIGNIN_DIFFICULTY) : issueHumanChallenge();
  return challenge ? Response.json({ mode, ...challenge }, { headers }) : Response.json({ mode: "off" }, { headers });
}
