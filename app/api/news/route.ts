// API route for fetching news data. Returns the latest news for a specific team or an error if unavailable.
import { hubData } from "../../../lib/feeds";
import { isTeamId } from "../../../lib/teams/teams";
export async function GET(request: Request) {
  const requestedTeam = new URL(request.url).searchParams.get("team");
  if (requestedTeam !== null && !isTeamId(requestedTeam))
    return Response.json({ error: "Invalid team" }, { status: 400 });
  try {
    return Response.json(await hubData("news", requestedTeam || undefined), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "Refresh unavailable" }, { status: 503 });
  }
}
