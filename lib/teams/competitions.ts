import { teams, type TeamId } from "./teams";
import { teamProviders } from "./providers";

// Shared league registry for team schedules and live score refreshes.
// Club teams can play outside their domestic league (see `extraCompetitions`
// in lib/teams/<id>/providers.ts).
const extraCompetitions = (team: TeamId) =>
  teamProviders.find((p) => p.team === team)?.extraCompetitions || {};

// Teams in several competitions label games by competition, not season phase.
export const playsMultipleCompetitions = (team: TeamId) =>
  Object.keys(extraCompetitions(team)).length > 0;

export const extraCompetitionName = (team: TeamId, league: string) =>
  extraCompetitions(team)[league] as string | undefined;

export function teamPlaysCompetition(team: TeamId, league: string) {
  return (
    teams.find((t) => t.id === team)?.league === league ||
    league in extraCompetitions(team)
  );
}

export const scoreboardLeagues = [
  ...new Set([
    ...teams.map((t) => t.league).filter(Boolean),
    ...teamProviders.flatMap((p) => Object.keys(p.extraCompetitions || {})),
  ]),
];
