import type { Game } from "../feeds";
// Prefer the event's actual scoreboard; never send Powerball results to its overview.
export function tournamentScoresUrl(g: Game) {
  if (
    g.team === "disc" &&
    (g.id.includes("powerball-2026") || g.url.includes("/2026-powerball-cup/"))
  )
    return "https://www.dgpt.com/event-scores/?id=96421";
  return g.boxUrl || g.url;
}
export function injuryReportUrl(team: string): string | undefined {
  if (team === "loons")
    return "https://www.mlssoccer.com/league-reports/player-availability-report/";
  if (team === "palace")
    return "https://www.premierleague.com/en/news/4450606/latest-premier-league-player-injuries-club-by-club-news";
  if (team === "twins")
    return "https://www.mlb.com/twins/news/topic/twins-injury-report";
  if (team === "vikings") return "https://www.vikings.com/team/injury-report/";
  const league: Record<string, string> = {
    wolves: "nba",
    wild: "nhl",
    vikings: "nfl",
    twins: "mlb",
    lynx: "wnba",
  };
  return league[team]
    ? `https://www.espn.com/${league[team]}/injuries`
    : undefined;
}
