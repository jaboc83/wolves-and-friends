// API route for fetching hub data. Returns the latest feed data or an error if unavailable.
import { hubData } from "../../../lib/feeds";
export async function GET() {
  try {
    return Response.json(await hubData(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      { error: "Feeds could not be refreshed. Please try again." },
      { status: 503 },
    );
  }
}
