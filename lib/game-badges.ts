import type { Game } from "./feeds";
export type GameBadge = { label: string; tone: string };
export function gameBadges(g: Game): GameBadge[] {
  const context = [g.league, g.competitionNote, g.eventOnly ? g.name : ""]
    .filter(Boolean)
    .join(" ");
  const badges: GameBadge[] = [];
  if (g.team === "disc") {
    if (/jomezpro/i.test(context))
      badges.push({ label: "JomezPro", tone: "jomezpro" });
    else if (
      /pdga major|united states disc golf championship/i.test(
        context,
      )
    )
      badges.push({ label: "PDGA Major", tone: "pdga-major" });
    else if (/\bdgpt\b/i.test(context))
      badges.push({ label: "DGPT", tone: "dgpt" });
  }
  if (g.team === "palace") {
    if (/uefa europa league|europa league/i.test(context))
      badges.push({ label: "Europa League", tone: "europa-league" });
    else if (/\bfriendly\b|\bfriendlies\b/i.test(context))
      badges.push({ label: "Friendly", tone: "friendly" });
    else if (/premier league|\bEPL\b|eng\.1/i.test(context))
      badges.push({ label: "Premier", tone: "premier" });
  }
  if (/pre[- ]?season/i.test(context))
    badges.push({ label: "Preseason", tone: "preseason" });
  if (/play[- ]?offs?|post[- ]?season|stanley cup|world series/i.test(context))
    badges.push({ label: "Playoffs", tone: "playoffs" });
  else if (/play[- ]?in/i.test(context))
    badges.push({ label: "Play-In", tone: "playoffs" });
  if (/\bcup\b|\bKMT\b/i.test(context) && !/stanley cup/i.test(context)) {
    const label = /NBA Cup/i.test(context)
      ? "NBA Cup"
      : /KMT/i.test(context)
        ? "KMT Cup"
        : /FA Cup/i.test(context)
          ? "FA Cup"
          : /League Cup/i.test(context)
            ? "League Cup"
            : /MLS Cup/i.test(context)
              ? "MLS Cup"
              : "Cup";
    badges.push({ label, tone: "cup" });
  }
  if (/EuroLeague|Eurolyga/i.test(context))
    badges.push({ label: "EuroLeague", tone: "euroleague" });
  if (/\bLKL\b|Lietuvos Krepšinio Lyga/i.test(context))
    badges.push({ label: "LKL", tone: "lkl" });
  return badges;
}
