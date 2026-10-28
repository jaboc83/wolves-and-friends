import { leagueHeadlines } from "../../../lib/feeds";
import { teams } from "../../../lib/teams/teams";

export async function GET(request: Request) {
  const league = new URL(request.url).searchParams.get("league");
  if (!league || !teams.some((team) => team.league === league))
    return Response.json({ error: "Invalid league" }, { status: 400 });
  try {
    return Response.json({ stories: await leagueHeadlines(league) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "Refresh unavailable" }, { status: 503 });
  }
}