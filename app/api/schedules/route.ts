// API route for fetching schedules data. Returns the latest schedules or an error if unavailable.
import { hubData } from "../../../lib/feeds";
export async function GET() {
  try {
    return Response.json(await hubData("schedules"), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "Refresh unavailable" }, { status: 503 });
  }
}
