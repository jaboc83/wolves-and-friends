// Selects competition and season badges displayed on game cards.
import type { Game } from "../feeds";
import { teamProfile } from "../teams/teams";
export type GameBadge = { label: string; tone: string };
export function gameBadges(g: Game): GameBadge[] {
  const context = [g.league, g.competitionNote, g.eventOnly ? g.name : ""]
    .filter(Boolean)
    .join(" ");
  const badges: GameBadge[] = [];
  const teamBadge = teamProfile(g.team)?.badges?.find(({ pattern }) =>
    new RegExp(pattern, "i").test(context),
  );
  if (teamBadge) badges.push({ label: teamBadge.label, tone: teamBadge.tone });
  if (/pre[- ]?season/i.test(context))
    badges.push({ label: "Preseason", tone: "preseason" });
  if (/play[- ]?offs?|post[- ]?season|stanley cup|world series/i.test(context))
    badges.push({ label: "Playoffs", tone: "playoffs" });
  else if (/play[- ]?in/i.test(context))
    badges.push({ label: "Play-In", tone: "playoffs" });
  if (/\bcup\b|\bKMT\b/i.test(context) && !/stanley cup/i.test(context)) {
    const nbaCup = /NBA Cup/i.test(context);
    const label = nbaCup
      ? "NBA Cup"
      : /KMT/i.test(context)
        ? "KMT Cup"
        : /FA Cup/i.test(context)
          ? "FA Cup"
          : /League Cup|Carabao Cup/i.test(context)
            ? "Carabao Cup"
            : /MLS Cup/i.test(context)
              ? "MLS Cup"
              : "Cup";
    badges.push({ label, tone: nbaCup ? "nba-cup" : "cup" });
  }
  if (/EuroLeague|Eurolyga/i.test(context))
    badges.push({ label: "EuroLeague", tone: "euroleague" });
  if (/\bLKL\b|Lietuvos Krepšinio Lyga/i.test(context))
    badges.push({ label: "LKL", tone: "lkl" });
  return badges;
}
