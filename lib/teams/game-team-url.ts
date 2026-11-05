// Prefer ESPN team pages for teams identified by an ESPN game feed.
import { teams, type TeamId } from "./teams";
import { palaceOpponentPage, teamWikipediaUrl } from "./team-wikipedia";

const officialSoccerUrls: Record<string, string> = {
  "Minnesota United": "https://www.mnufc.com/",
  "Crystal Palace": "https://www.cpfc.co.uk/",
  "Fulham F.C.": "https://www.fulhamfc.com/",
  "Beşiktaş J.K.": "https://www.bjk.com.tr/en",
  "Olympique Lyonnais": "https://www.ol.fr/en",
  "Brighton & Hove Albion F.C.": "https://www.brightonandhovealbion.com/",
  "TSG 1899 Hoffenheim": "https://www.tsg-hoffenheim.de/",
  "Newcastle United F.C.": "https://www.newcastleunited.com/",
  "Tottenham Hotspur F.C.": "https://www.tottenhamhotspur.com/",
  "Arsenal F.C.": "https://www.arsenal.com/",
  "Chelsea F.C.": "https://www.chelseafc.com/",
  "Liverpool F.C.": "https://www.liverpoolfc.com/",
  "Manchester City F.C.": "https://www.mancity.com/",
  "Manchester United F.C.": "https://www.manutd.com/",
  "Everton F.C.": "https://www.evertonfc.com/",
  "Leeds United F.C.": "https://www.leedsunited.com/",
  "Aston Villa F.C.": "https://www.avfc.co.uk/",
  "West Ham United F.C.": "https://www.whufc.com/",
  "Nottingham Forest F.C.": "https://www.nottinghamforest.co.uk/",
  "A.F.C. Bournemouth": "https://www.afcb.co.uk/",
  "Real Sociedad": "https://www.realsociedad.eus/en/",
  "Jagiellonia Białystok": "https://www.jagiellonia.pl/",
  "Coventry City F.C.": "https://www.ccfc.co.uk/",
  "Hull City A.F.C.": "https://www.wearehullcity.co.uk/",
};

const normalize = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function officialSoccerUrl(teamId: TeamId, name?: string, ownTeam = false) {
  const team = teams.find((candidate) => candidate.id === teamId);
  if (!team?.league.startsWith("soccer/")) return undefined;

  if (ownTeam || name === team.name || name === team.short) {
    const ownUrl = officialSoccerUrls[team.name];
    if (ownUrl) return ownUrl;
  }

  const resolvedName =
    teamId === "palace" ? palaceOpponentPage(name || "") || name : name;
  const normalizedName = normalize(resolvedName || "");
  return Object.entries(officialSoccerUrls).find(([club]) => {
    const normalizedClub = normalize(club);
    return (
      normalizedName === normalizedClub ||
      normalizedName.startsWith(normalizedClub + " ")
    );
  })?.[1];
}

export function gameTeamUrl(
  teamId: TeamId,
  name?: string,
  ownTeam = false,
  espnTeamId?: string,
) {
  const team = teams.find((candidate) => candidate.id === teamId);
  const league = team?.league || "";
  const officialUrl = officialSoccerUrl(teamId, name, ownTeam);
  if (officialUrl) return officialUrl;

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
