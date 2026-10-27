import { powerRankingTeamNames } from "./power-rankings.ts";
import type { ProviderResponse } from "./provider-types";
import type { PowerRanking } from "./types";
const nbaBpiFallbackRows = [
  ["25", "1st", "8.572"],
  ["24", "2nd", "7.090"],
  ["16", "3rd", "6.261"],
  ["2", "4th", "5.418"],
  ["10", "5th", "3.985"],
  ["20", "6th", "3.804"],
  ["18", "7th", "3.758"],
  ["8", "8th", "3.613"],
  ["13", "9th", "3.192"],
  ["28", "10th", "3.047"],
  ["1", "11th", "3.034"],
  ["7", "12th", "2.737"],
  ["22", "13th", "2.676"],
  ["5", "14th", "2.505"],
  ["11", "15th", "0.688"],
  ["19", "16th", "0.367"],
  ["14", "17th", "-0.248"],
  ["30", "18th", "-1.657"],
  ["6", "19th", "-2.156"],
  ["21", "20th", "-2.363"],
  ["27", "21st", "-3.042"],
  ["29", "22nd", "-3.063"],
  ["26", "23rd", "-3.248"],
  ["9", "24th", "-3.856"],
  ["3", "25th", "-4.812"],
  ["12", "26th", "-5.026"],
  ["15", "27th", "-6.622"],
  ["4", "28th", "-6.786"],
  ["17", "29th", "-7.442"],
  ["23", "30th", "-10.426"],
].map(([id, rank, bpi]) => ({
  id,
  name: powerRankingTeamNames["basketball/nba"][id],
  url: `https://www.espn.com/nba/team/_/id/${id}`,
  cells: [rank, bpi],
}));
const nflFpiFallbackRows = [
  ["25", "1st", "5.9"],
  ["2", "2nd", "4.3"],
  ["26", "3rd", "4.3"],
  ["12", "4th", "4.0"],
  ["4", "5th", "3.9"],
  ["30", "6th", "3.9"],
  ["3", "7th", "3.9"],
  ["14", "8th", "3.4"],
  ["6", "9th", "2.3"],
  ["33", "10th", "2.3"],
  ["17", "11th", "2.3"],
  ["8", "12th", "1.8"],
  ["27", "13th", "1.8"],
  ["7", "14th", "1.5"],
  ["34", "15th", "1.5"],
  ["16", "16th", "1.4"],
  ["9", "17th", "1.3"],
  ["23", "18th", "-0.8"],
  ["11", "19th", "-1.2"],
  ["29", "20th", "-1.9"],
  ["24", "21st", "-2.1"],
  ["1", "22nd", "-2.6"],
  ["13", "23rd", "-2.9"],
  ["18", "24th", "-3.2"],
  ["28", "25th", "-3.2"],
  ["5", "26th", "-4.3"],
  ["19", "27th", "-4.3"],
  ["20", "28th", "-4.3"],
  ["22", "29th", "-5.0"],
  ["21", "30th", "-5.5"],
  ["10", "31st", "-6.3"],
  ["15", "32nd", "-7.3"],
].map(([id, rank, fpi]) => ({
  id,
  name: powerRankingTeamNames["football/nfl"][id],
  url: `https://www.espn.com/nfl/team/_/id/${id}`,
  cells: [rank, fpi],
}));
const wnbaBpiFallbackRows = [
  ["20", "1st", "5.831"],
  ["129689", "2nd", "5.742"],
  ["17", "3rd", "4.429"],
  ["8", "4th", "4.340"],
  ["9", "5th", "3.762"],
  ["5", "6th", "3.486"],
  ["3", "7th", "2.435"],
  ["16", "8th", "0.369"],
  ["11", "9th", "-1.655"],
  ["6", "10th", "-2.322"],
  ["19", "11th", "-3.040"],
  ["14", "12th", "-5.039"],
  ["132052", "13th", "-5.215"],
  ["18", "14th", "-6.404"],
  ["131935", "15th", "-6.719"],
].map(([id, rank, bpi]) => ({
  id,
  name: powerRankingTeamNames["basketball/wnba"][id],
  url: `https://www.espn.com/wnba/team/_/id/${id}`,
  cells: [rank, bpi],
}));
const nhlLogoIds: Record<string, string> = {
  "anaheim-ducks": "25",
  "boston-bruins": "1",
  "buffalo-sabres": "2",
  "calgary-flames": "3",
  "carolina-hurricanes": "7",
  "chicago-blackhawks": "4",
  "vegas-golden-knights": "37",
  "edmonton-oilers": "6",
  "colorado-avalanche": "17",
  "columbus-blue-jackets": "29",
  "dallas-stars": "9",
  "detroit-red-wings": "5",
  "florida-panthers": "26",
  "los-angeles-kings": "8",
  "montreal-canadiens": "10",
  "nashville-predators": "27",
  "new-jersey-devils": "11",
  "new-york-islanders": "12",
  "new-york-rangers": "13",
  "minnesota-wild": "30",
  "ottawa-senators": "14",
  "philadelphia-flyers": "15",
  "pittsburgh-penguins": "16",
  "san-jose-sharks": "18",
  "st-louis-blues": "19",
  "tampa-bay-lightning": "20",
  "toronto-maple-leafs": "21",
  "vancouver-canucks": "22",
  "washington-capitals": "23",
  "winnipeg-jets": "28",
  "utah-mammoth": "129764",
  "seattle-kraken": "124292",
};
const nhlRankingNames: Record<string, string> = {
  Hurricanes: "Carolina Hurricanes",
  Oilers: "Edmonton Oilers",
  Avalanche: "Colorado Avalanche",
  "Golden Knights": "Vegas Golden Knights",
  Lightning: "Tampa Bay Lightning",
  Mammoth: "Utah Mammoth",
  Wild: "Minnesota Wild",
  Rangers: "New York Rangers",
  Panthers: "Florida Panthers",
  Senators: "Ottawa Senators",
  Ducks: "Anaheim Ducks",
  Penguins: "Pittsburgh Penguins",
  Stars: "Dallas Stars",
  Capitals: "Washington Capitals",
  Canadiens: "Montreal Canadiens",
  "Maple Leafs": "Toronto Maple Leafs",
  Jets: "Winnipeg Jets",
  Bruins: "Boston Bruins",
  Sabres: "Buffalo Sabres",
  Devils: "New Jersey Devils",
  Blues: "St. Louis Blues",
  Kraken: "Seattle Kraken",
  Sharks: "San Jose Sharks",
  "Blue Jackets": "Columbus Blue Jackets",
  Islanders: "New York Islanders",
  Predators: "Nashville Predators",
  "Red Wings": "Detroit Red Wings",
  Blackhawks: "Chicago Blackhawks",
  Kings: "Los Angeles Kings",
  Canucks: "Vancouver Canucks",
  Flames: "Calgary Flames",
  Flyers: "Philadelphia Flyers",
};
const teamLogoSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const soccerLogoIds: Record<string, string> = {
  "Minnesota United": "17362",
  "Minnesota United FC": "17362",
  "Nashville SC": "18986",
  "St. Louis CITY SC": "21812",
  "Philadelphia Union": "10739",
  "Vancouver Whitecaps FC": "9727",
  "Inter Miami CF": "20232",
  "Chicago Fire FC": "193",
  "FC Dallas": "185",
  "Charlotte FC": "22406",
  "San Jose Earthquakes": "191",
  "Seattle Sounders FC": "9726",
  "New England Revolution": "189",
  "Orlando City": "120",
  "Houston Dynamo FC": "6077",
  "Los Angeles Football Club": "18966",
  "Colorado Rapids": "184",
  "Red Bull New York": "399",
  "FC Cincinnati": "18202",
  "Columbus Crew": "183",
  "New York City Football Club": "17606",
  "LA Galaxy": "187",
  "Toronto FC": "7318",
  "Portland Timbers": "9723",
  "San Diego FC": "22529",
  "D.C. United": "193",
  "Real Salt Lake": "4771",
  "Austin FC": "20906",
  "Atlanta United": "18418",
  "Sporting Kansas City": "186",
  "CF Montréal": "9729",
  "CF MontrÃ©al": "9729",
  "Crystal Palace": "384",
  Arsenal: "359",
  "Manchester City": "382",
  Liverpool: "364",
  "Brighton & Hove Albion": "397",
  Chelsea: "363",
  "Aston Villa": "362",
  "Manchester United": "360",
  Brentford: "337",
  Bournemouth: "8678",
  Everton: "368",
  "Leeds United": "357",
  "Newcastle United": "361",
  "Tottenham Hotspur": "367",
  "Nottingham Forest": "393",
  Fulham: "370",
  "Ipswich Town": "373",
  Sunderland: "366",
  "Hull City": "361",
  "Coventry City": "389",
};
const soccerLogoUrl = (name: string, league: string) =>
  `/api/team-logo?league=${encodeURIComponent(league)}&id=${
    soccerLogoIds[name] || teamLogoSlug(name)
  }`;

const mlsPowerRankingRows = [
  ["nashville-sc", "Nashville SC"],
  ["st-louis-city-sc", "St. Louis CITY SC"],
  ["philadelphia-union", "Philadelphia Union"],
  ["vancouver-whitecaps-fc", "Vancouver Whitecaps FC"],
  ["inter-miami-cf", "Inter Miami CF"],
  ["chicago-fire-fc", "Chicago Fire FC"],
  ["fc-dallas", "FC Dallas"],
  ["charlotte-fc", "Charlotte FC"],
  ["san-jose-earthquakes", "San Jose Earthquakes"],
  ["seattle-sounders-fc", "Seattle Sounders FC"],
  ["new-england-revolution", "New England Revolution"],
  ["orlando-city", "Orlando City"],
  ["houston-dynamo-fc", "Houston Dynamo FC"],
  ["los-angeles-football-club", "Los Angeles Football Club"],
  ["colorado-rapids", "Colorado Rapids"],
  ["new-york-red-bulls", "Red Bull New York"],
  ["fc-cincinnati", "FC Cincinnati"],
  ["columbus-crew", "Columbus Crew"],
  ["new-york-city-football-club", "New York City Football Club"],
  ["la-galaxy", "LA Galaxy"],
  ["toronto-fc", "Toronto FC"],
  ["portland-timbers", "Portland Timbers"],
  ["san-diego-fc", "San Diego FC"],
  ["dc-united", "D.C. United"],
  ["real-salt-lake", "Real Salt Lake"],
  ["austin-fc", "Austin FC"],
  ["atlanta-united", "Atlanta United"],
  ["minnesota-united-fc", "Minnesota United"],
  ["sporting-kansas-city", "Sporting Kansas City"],
  ["cf-montreal", "CF Montréal"],
].map(([id, name], index) => ({
  id,
  name,
  url: `https://www.mlssoccer.com/clubs/${id}`,
  logo: soccerLogoUrl(name, "soccer/usa.1"),
  cells: [
    `${index + 1}${index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"}`,
    "",
  ],
}));
const mlbLogoIds: Record<string, string> = {
  "Milwaukee Brewers": "8",
  "Los Angeles Dodgers": "19",
  "Tampa Bay Rays": "30",
  "Atlanta Braves": "15",
  "Chicago Cubs": "16",
  "San Diego Padres": "25",
  "New York Yankees": "10",
  "Philadelphia Phillies": "22",
  "Boston Red Sox": "2",
  "Cleveland Guardians": "5",
  "Arizona Diamondbacks": "29",
  "Chicago White Sox": "4",
  "Pittsburgh Pirates": "23",
  "Texas Rangers": "13",
  "Toronto Blue Jays": "14",
  "Houston Astros": "18",
  "Miami Marlins": "28",
  "Baltimore Orioles": "1",
  "St. Louis Cardinals": "24",
  "Detroit Tigers": "6",
  "Minnesota Twins": "9",
  "Seattle Mariners": "12",
  "Washington Nationals": "20",
  "New York Mets": "21",
  "Cincinnati Reds": "17",
  "Kansas City Royals": "7",
  "San Francisco Giants": "26",
  "Los Angeles Angels": "3",
  Athletics: "11",
  "Colorado Rockies": "27",
};
const mlbLogoUrl = (name: string) =>
  `/api/team-logo?league=baseball%2Fmlb&id=${mlbLogoIds[name] || teamLogoSlug(name)}`;

export const powerRankingFallback = (
  league: string,
  teamId: string,
  checked: string,
): PowerRanking | undefined => {
  const snapshots: Record<string, PowerRanking> = {
    "basketball/nba:wolves": {
      name: "ESPN Power Rankings",
      metric: "BPI",
      rows: nbaBpiFallbackRows,
      source: "ESPN BPI cached snapshot",
      url: "https://www.espn.com/nba/bpi",
      checked,
      publishedAt: "2026-10-27T07:40:00Z",
      note: "Cached full ESPN BPI snapshot; live ranking feed unavailable.",
    },
    "football/nfl:vikings": {
      name: "ESPN Power Rankings",
      metric: "FPI",
      rows: nflFpiFallbackRows,
      source: "ESPN FPI cached snapshot",
      url: "https://www.espn.com/nfl/fpi",
      checked,
      publishedAt: "2026-10-27T06:00:00Z",
      note: "Cached full ESPN FPI snapshot; live ranking feed unavailable.",
    },
    "basketball/wnba:lynx": {
      name: "ESPN Power Rankings",
      metric: "BPI",
      rows: wnbaBpiFallbackRows,
      source: "ESPN BPI cached snapshot",
      url: "https://www.espn.com/wnba/bpi",
      checked,
      publishedAt: "2026-10-27T07:09:00Z",
      note: "Cached full ESPN BPI snapshot; live ranking feed unavailable.",
    },
    "hockey/nhl:wild": {
      name: "NHL Power Rankings",
      metric: "Rank",
      rows: nhlCbsFallbackRows,
      source: "CBS Sports NHL Power Rankings cached snapshot",
      url: "https://www.cbssports.com/nhl/powerrankings/",
      checked,
      publishedAt: "2026-10-14T14:49:00Z",
      note: "Cached CBS Sports snapshot; live ranking feed unavailable.",
    },
    "soccer/usa.1:loons": {
      name: "MLS Power Rankings",
      metric: "Rank",
      rows: mlsPowerRankingRows,
      source: "MLS Power Rankings cached snapshot",
      url: "https://www.mlssoccer.com/news/power-rankings-can-anyone-slow-down-st-louis-city-sc",
      checked,
      publishedAt: "2026-10-13T15:55:00Z",
      note: "Cached MLS Power Rankings snapshot; live article feed unavailable.",
    },
    "baseball/mlb:twins": {
      name: "MLB Power Rankings",
      metric: "Rank",
      rows: mlbPowerRankingFallbackRows,
      source: "CBS Sports MLB Power Rankings cached snapshot",
      url: "https://www.cbssports.com/mlb/powerrankings/",
      checked,
      publishedAt: "2026-09-21T13:28:00Z",
      note: "Cached CBS Sports snapshot; live ranking feed unavailable.",
    },
  };
  return snapshots[`${league}:${teamId}`];
};

const analystPremierLeaguePowerRankingsUrl =
  "https://theanalyst.com/competition/premier-league/power-rankings";
export const analystPremierLeaguePowerRankingsEndpoint =
  "https://theanalyst.com/wp-json/sdapi/v1/soccerdata/seasonpowerrankings?tmcl=6pdwluctev9iebv00r4qqukno";

const ordinal = (rank: number) => {
  const mod100 = rank % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : rank % 10 === 1
        ? "st"
        : rank % 10 === 2
          ? "nd"
          : rank % 10 === 3
            ? "rd"
            : "th";
  return `${rank}${suffix}`;
};

const nhlCbsFallbackRows = [
  "Carolina Hurricanes",
  "Edmonton Oilers",
  "Colorado Avalanche",
  "Vegas Golden Knights",
  "Tampa Bay Lightning",
  "Utah Mammoth",
  "Minnesota Wild",
  "New York Rangers",
  "Florida Panthers",
  "Ottawa Senators",
  "Anaheim Ducks",
  "Pittsburgh Penguins",
  "Dallas Stars",
  "Washington Capitals",
  "Montreal Canadiens",
  "Toronto Maple Leafs",
  "Winnipeg Jets",
  "Boston Bruins",
  "Buffalo Sabres",
  "New Jersey Devils",
  "St. Louis Blues",
  "Seattle Kraken",
  "San Jose Sharks",
  "Columbus Blue Jackets",
  "New York Islanders",
  "Nashville Predators",
  "Detroit Red Wings",
  "Chicago Blackhawks",
  "Los Angeles Kings",
  "Vancouver Canucks",
  "Calgary Flames",
  "Philadelphia Flyers",
].map((name, index) => ({
  id: teamLogoSlug(name),
  name,
  url: "https://www.cbssports.com/nhl/powerrankings/",
  logo: `/api/team-logo?league=hockey%2Fnhl&id=${nhlLogoIds[teamLogoSlug(name)] || teamLogoSlug(name)}`,
  cells: [ordinal(index + 1)],
}));

const mlbPowerRankingFallbackRows = [
  "Milwaukee Brewers",
  "Los Angeles Dodgers",
  "Tampa Bay Rays",
  "Atlanta Braves",
  "Chicago Cubs",
  "San Diego Padres",
  "New York Yankees",
  "Philadelphia Phillies",
  "Boston Red Sox",
  "Cleveland Guardians",
  "Arizona Diamondbacks",
  "Chicago White Sox",
  "Pittsburgh Pirates",
  "Texas Rangers",
  "Toronto Blue Jays",
  "Houston Astros",
  "Miami Marlins",
  "Baltimore Orioles",
  "St. Louis Cardinals",
  "Detroit Tigers",
  "Minnesota Twins",
  "Seattle Mariners",
  "Washington Nationals",
  "New York Mets",
  "Cincinnati Reds",
  "Kansas City Royals",
  "San Francisco Giants",
  "Los Angeles Angels",
  "Athletics",
  "Colorado Rockies",
].map((name, index) => ({
  id: teamLogoSlug(name),
  name,
  url: "https://www.cbssports.com/mlb/powerrankings/",
  logo: mlbLogoUrl(name),
  cells: [ordinal(index + 1)],
}));
const mlbRankingNames: Record<string, string> = {
  Brewers: "Milwaukee Brewers",
  Dodgers: "Los Angeles Dodgers",
  Rays: "Tampa Bay Rays",
  Braves: "Atlanta Braves",
  Cubs: "Chicago Cubs",
  Padres: "San Diego Padres",
  Yankees: "New York Yankees",
  Phillies: "Philadelphia Phillies",
  "Red Sox": "Boston Red Sox",
  Guardians: "Cleveland Guardians",
  Diamondbacks: "Arizona Diamondbacks",
  "White Sox": "Chicago White Sox",
  Pirates: "Pittsburgh Pirates",
  Rangers: "Texas Rangers",
  "Blue Jays": "Toronto Blue Jays",
  Astros: "Houston Astros",
  Marlins: "Miami Marlins",
  Orioles: "Baltimore Orioles",
  Cardinals: "St. Louis Cardinals",
  Mets: "New York Mets",
  Twins: "Minnesota Twins",
  Giants: "San Francisco Giants",
  Mariners: "Seattle Mariners",
  Reds: "Cincinnati Reds",
  Royals: "Kansas City Royals",
  Tigers: "Detroit Tigers",
  Angels: "Los Angeles Angels",
  Rockies: "Colorado Rockies",
  Athletics: "Athletics",
  Nationals: "Washington Nationals",
};

const plainHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function parseCbsMlbPowerRanking(
  html: string,
  checked: string,
): PowerRanking | undefined {
  const table = html.match(/Rk[\s\S]{0,250000}/i)?.[0] || html;
  let rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap(
    (match) => {
      const cells = [
        ...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi),
      ].map((cell) => plainHtml(cell[1]));
      const rank = Number(cells[0]);
      const shortName = cells[1]?.replace(/\s*\(.*$/, "");
      const name = mlbRankingNames[shortName] || shortName;
      if (!Number.isInteger(rank) || rank < 1 || !name) return [];
      return [
        {
          id: teamLogoSlug(name),
          name,
          url: "https://www.cbssports.com/mlb/powerrankings/",
          logo: mlbLogoUrl(name),
          cells: [ordinal(rank)],
        },
      ];
    },
  );
  if (rows.length < 10) {
    const namesBySlug = new Map(
      Object.values(mlbRankingNames).map((name) => [teamLogoSlug(name), name]),
    );
    const seen = new Set<string>();
    rows = [
      ...table.matchAll(
        /href=["'](?:https?:\/\/www\.cbssports\.com)?\/mlb\/teams\/([^/"']+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
      ),
    ].flatMap((match, index) => {
      const slug = match[1].toLowerCase();
      const name = namesBySlug.get(slug);
      if (!name || seen.has(slug)) return [];
      seen.add(slug);
      return [
        {
          id: slug,
          name,
          url: "https://www.cbssports.com/mlb/powerrankings/",
          logo: `/api/team-logo?league=baseball%2Fmlb&id=${slug}`,
          cells: [ordinal(index + 1)],
        },
      ];
    });
  }
  if (rows.length < 10 || !rows.some((row) => row.name === "Minnesota Twins"))
    return;
  return {
    name: "MLB Power Rankings",
    metric: "Rank",
    rows,
    source: "CBS Sports",
    url: "https://www.cbssports.com/mlb/powerrankings/",
    checked,
    publishedAt: checked,
    note: "Latest CBS Sports MLB Power Rankings.",
  };
}

export function parseCbsNhlPowerRanking(
  html: string,
  checked: string,
): PowerRanking | undefined {
  const table = html.match(/Rk[\s\S]{0,250000}/i)?.[0] || html;
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap(
    (match) => {
      const cells = [
        ...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi),
      ].map((cell) => plainHtml(cell[1]));
      const rank = Number(cells[0]);
      const shortName = cells[1]?.replace(/\s*\(.*$/, "");
      const name = nhlRankingNames[shortName] || shortName;
      if (!Number.isInteger(rank) || rank < 1 || !name) return [];
      const slug = teamLogoSlug(name);
      return [
        {
          id: slug,
          name,
          url: "https://www.cbssports.com/nhl/powerrankings/",
          logo: `/api/team-logo?league=hockey%2Fnhl&id=${nhlLogoIds[slug] || slug}`,
          cells: [ordinal(rank)],
        },
      ];
    },
  );
  if (rows.length < 10) return;
  return {
    name: "NHL Power Rankings",
    metric: "Rank",
    rows,
    source: "CBS Sports",
    url: "https://www.cbssports.com/nhl/powerrankings/",
    checked,
    publishedAt: checked,
    note: "Latest CBS Sports NHL Power Rankings.",
  };
}

export function parseAnalystPremierLeaguePowerRanking(
  value: ProviderResponse,
  checked: string,
): PowerRanking | undefined {
  const ranking = value?.division?.find(
    (division) => division.type === "global",
  )?.ranking;
  if (!Array.isArray(ranking)) return;
  const rows = ranking.flatMap((entry) => {
    const rank = Number(entry.rank);
    const rating = Number(entry.currentRating);
    if (
      !entry.contestantId ||
      !entry.contestantName ||
      !Number.isFinite(rank) ||
      !Number.isFinite(rating)
    )
      return [];
    return [
      {
        id: String(entry.contestantId),
        name: String(entry.contestantName),
        url: analystPremierLeaguePowerRankingsUrl,
        logo: soccerLogoUrl(String(entry.contestantName), "soccer/eng.1"),
        cells: [ordinal(rank), rating.toFixed(1)],
      },
    ];
  });
  if (rows.length < 10 || !rows.some((row) => row.name === "Crystal Palace"))
    return;
  return {
    name: "Premier League Opta Power Rankings",
    metric: "Rating",
    rows,
    source: "Opta Analyst",
    url: analystPremierLeaguePowerRankingsUrl,
    checked,
    publishedAt: value.lastUpdated || checked,
    note: "Premier League clubs ranked by Opta Power Rankings rating.",
  };
}
