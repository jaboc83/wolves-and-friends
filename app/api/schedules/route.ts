// API route for fetching schedules data. Returns the latest schedules or an error if unavailable.
import { hubData } from "../../../lib/feeds";
export async function GET() {
  try {
    return Response.json(await hubData("schedules"), {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=21600" },
    });
  } catch {
    return Response.json({ error: "Refresh unavailable" }, { status: 503 });
  }
}
