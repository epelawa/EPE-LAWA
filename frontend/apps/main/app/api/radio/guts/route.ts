import { GUTS_FM } from "../../../../lib/guts-radio";

// Keep the existing endpoint for clients running a cached version of the player.
export function GET() {
  const { name, frequency, streamUrl } = GUTS_FM;
  return Response.json(
    { station: { name, frequency, streamUrl }, reason: "ready" },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } },
  );
}
