// Chooses score/details and injury-report destinations linked from game cards.
import type { Game } from "../feeds";
import { teamProfile, teams, type TeamId } from "../teams/teams";
// Prefer the event's actual scoreboard (see `eventScoreLinks` in team profiles).
export function tournamentScoresUrl(g: Game) {
  const override = teamProfile(g.team)?.eventScoreLinks?.find(({ pattern }) =>
    new RegExp(pattern).test(g.id + " " + g.url),
  );
  return override?.url || g.boxUrl || g.url;
}
export function injuryReportUrl(team: TeamId): string | undefined {
  return teams.find((t) => t.id === team)?.injuryReportUrl || undefined;
}
