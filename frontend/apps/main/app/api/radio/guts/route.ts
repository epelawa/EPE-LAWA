import { getGutsStation } from "../../../../lib/guts-radio";

export async function GET() {
  const result = await getGutsStation();
  return Response.json(result, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } });
}
