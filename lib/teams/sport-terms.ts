// Chooses sport-appropriate labels for games, tournaments, standings, and stats.
import type { DashboardPageId } from "../dashboard/page-id";
import { teamProfile } from "./teams";

/** Presentation vocabulary only; feed field names remain unchanged. */
export function sportTerms(team: DashboardPageId) {
  const profile = teamProfile(team);
  const soccer = profile?.sportKind === "soccer";
  const disc = profile?.sportKind === "disc";
  const all = team === "all";
  return {
    event: all ? "event" : disc ? "tournament" : soccer ? "match" : "game",
    events: all
      ? "events"
      : disc
        ? "tournaments"
        : soccer
          ? "matches"
          : "games",
    standings: all
      ? "Standings/Table"
      : disc
        ? "DGPT season standings"
        : soccer
          ? "Table"
          : "Standings",
    roster: all ? "Roster/Squad" : profile?.terms?.roster || "Roster",
    calendar: all
      ? "Event calendar"
      : disc
        ? "Tournament calendar"
        : profile?.terms?.calendar ||
          (soccer ? "Match calendar" : "Game calendar"),
    stats: disc ? "Tournament results" : soccer ? "Match stats" : "Box score",
    tieCode: soccer ? "D" : "T",
    tieLabel: soccer ? "Draw" : "Tie",
  };
}
