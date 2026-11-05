// API route for fetching odds data. Returns the latest odds or an error if unavailable.
import { oddsData } from "../../../lib/feeds";
export async function GET() {
  try {
    return Response.json(await oddsData(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "Refresh unavailable" }, { status: 503 });
  }
}
