import { teams } from "./teams";

// Shared league registry for team schedules and live score refreshes.
// Club teams can play outside their domestic league. Share this registry
// between schedule collection and the frequent live scoreboard refresh.
export const palaceCompetitions: Record<string, string> = {
  "soccer/uefa.europa": "UEFA Europa League",
  "soccer/uefa.europa.conf": "UEFA Conference League",
  "soccer/uefa.champions": "UEFA Champions League",
  "soccer/eng.fa": "FA Cup",
  "soccer/eng.league_cup": "Carabao Cup",
  "soccer/eng.charity": "Community Shield",
};

export function teamPlaysCompetition(team: string, league: string) {
  return (
    teams.find((t) => t.id === team)?.league === league ||
    (team === "palace" && league in palaceCompetitions)
  );
}

export const scoreboardLeagues = [
  ...new Set([
    ...teams.map((t) => t.league).filter(Boolean),
    ...Object.keys(palaceCompetitions),
  ]),
];
