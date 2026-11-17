// Returns the bundled local logo path for a team ID.
import { teams, type TeamId } from "./teams";
import { pwhlLogoPath } from "./pwhl-team-url";
export function teamLogoPath(teamId: TeamId): string {
  return teams.find((t) => t.id === teamId)?.logo || `/logos/${teamId}.png`;
}
const opponentLogoFolders: Record<string, string> = {
  "usa.1": "mls",
  "eng.1": "epl",
};
const premierLeagueIds: Record<string, string> = {
  bournemouth: "349",
  arsenal: "359",
  villa: "362",
  "aston villa": "362",
  brentford: "337",
  brighton: "331",
  chelsea: "363",
  coventry: "388",
  everton: "368",
  fulham: "370",
  hull: "306",
  ipswich: "373",
  leeds: "357",
  liverpool: "364",
  "man city": "382",
  "man utd": "360",
  newcastle: "361",
  "newcastle utd": "361",
  forest: "393",
  "nottm forest": "393",
  sunderland: "366",
  spurs: "367",
};
const dgptEventSlug = /^https:\/\/(?:www\.)?dgpt\.com\/event\/([a-z0-9-]+)\/?$/;
// Bundled event logo copied from the DGPT schedule page, keyed by the event URL slug.
export function dgptEventLogoPath(url?: string): string | undefined {
  const slug = url?.match(dgptEventSlug)?.[1];
  return slug ? `/logos/dgpt/${slug}.png` : undefined;
}
// Bundled logo for an opponent in the team's home league, keyed by ESPN team id.
export function opponentLogoPath(
  teamId: TeamId,
  opponentId?: string,
  opponentName?: string,
): string | undefined {
  const league = teams.find((t) => t.id === teamId)?.league.split("/")[1];
  if (teamId === "frost") return pwhlLogoPath(opponentName);
  const id =
    opponentId ||
    (league === "eng.1"
      ? premierLeagueIds[(opponentName || "").toLowerCase()]
      : undefined);
  if (!league || !id || !/^\d+$/.test(id)) return undefined;
  return `/logos/opponents/${opponentLogoFolders[league] ?? league}/${id}.png`;
}
