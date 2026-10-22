import { hubData } from "../../../lib/feeds";
import { isTeamId, type TeamId } from "../../../lib/teams/teams";
export async function GET(request: Request) {
  const team = new URL(request.url).searchParams.get("team") || undefined;
  let teamId: TeamId | undefined;
  if (team) {
    if (!isTeamId(team))
      return Response.json({ error: "Unknown team" }, { status: 400 });
    teamId = team;
  }
  try {
    return Response.json(await hubData("news", teamId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "Refresh unavailable" }, { status: 503 });
  }
}
