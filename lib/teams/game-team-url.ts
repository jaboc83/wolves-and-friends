// Prefer ESPN team pages for teams identified by an ESPN game feed.
import { teams, type TeamId } from "./teams";
import { teamWikipediaUrl } from "./team-wikipedia";

export function gameTeamUrl(
  teamId: TeamId,
  name?: string,
  ownTeam = false,
  espnTeamId?: string,
) {
  const team = teams.find((candidate) => candidate.id === teamId);
  const league = team?.league || "";
  if (espnTeamId && /^\d+$/.test(espnTeamId) && league) {
    const route = league.startsWith("soccer/")
      ? "soccer"
      : league.split("/")[1];
    if (route)
      return (
        `https://www.espn.com/${route}/team/_/id/` +
        encodeURIComponent(espnTeamId)
      );
  }
  return teamWikipediaUrl(teamId, name, ownTeam);
}
