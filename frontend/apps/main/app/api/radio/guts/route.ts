import { getGutsStation } from "../../../../lib/guts-radio";

export async function GET() {
  const station = await getGutsStation();
  return Response.json({ station }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } });
}
