// Fetches and combines public standings, rosters, postseason, and team-season data.
import { decorateTable } from "./standings";
export { decorateTable, tableSeasonType } from "./standings";
import { teams } from "../teams/teams";
import { teamProviders } from "../teams/providers";
import { serverHooksFor } from "../teams/server";
import { fetchPostseason, type Postseason } from "../games/postseason";
import { rosterDetails, type RosterDetails } from "./roster-details";
export type Table = {
  stale?: boolean;
  seasonType?: number;
  name: string;
  columns: string[];
  rows: {
    id: string;
    name: string;
    url: string;
    cells: string[];
    highlight?: boolean;
    zone?: string;
  }[];
  source: string;
  url: string;
  checked: string;
  note?: string;
  cuts?: { after: number; label: string }[];
  qualification?: string;
};
export type PowerRanking = {
  name: string;
  metric: string;
  rows: (Table["rows"][number] & { logo?: string })[];
  source: string;
  url: string;
  checked: string;
  publishedAt: string;
  note?: string;
};
export type Depth = {
  label: string;
  groups: {
    position: string;
    players: ({
      name: string;
      url: string;
      starter?: boolean;
    } & RosterDetails)[];
  }[];
  source: string;
  url: string;
  checked: string;
  note?: string;
};
export type TeamInfo = {
  postseason?: Postseason;
  powerRanking?: PowerRanking;
  id: string;
  tables: Table[];
  depth?: Depth;
  season?: {
    name: string;
    start: string;
    end: string;
    source: string;
    url: string;
    note?: string;
  };
  unavailable: string[];
};
type ESPNLink = { rel?: string[]; href?: string };
type ESPNTeam = {
  id?: string | number;
  abbreviation?: string;
  displayName?: string;
  name?: string;
  logo?: string;
  logos?: { href?: string }[];
  links?: ESPNLink[];
  team?: ESPNTeam;
};
type ESPNSeason = {
  type?: number | string | { type?: number | string };
  year?: number | string;
  startDate?: string;
  endDate?: string;
  displayName?: string;
};
type ESPNStat = {
  name?: string;
  value?: string | number;
  displayValue?: string | number;
};
type ESPNStandingEntry = {
  team?: ESPNTeam;
  stats?: ESPNStat[];
};
type ESPNStandings = {
  entries?: ESPNStandingEntry[];
  links?: ESPNLink[];
  seasonType?: number | string | { type?: number | string };
  seasonDisplayName?: string;
};
type ESPNStandingsNode = {
  name?: string;
  standings?: ESPNStandings;
  children?: ESPNStandingsNode[];
};
type ESPNPosition = {
  displayName?: string;
  name?: string;
  abbreviation?: string;
};
type ESPNAthlete = {
  id?: string | number;
  displayName?: string;
  fullName?: string;
  name?: string;
  dateOfBirth?: string;
  age?: number;
  links?: ESPNLink[];
  position?: ESPNPosition;
  items?: ESPNRosterEntry[];
  athlete?: ESPNAthlete;
};
type ESPNRosterEntry = ESPNAthlete;
type ESPNDepthPosition = {
  athletes?: ESPNAthlete[];
  position?: ESPNPosition;
};
type ESPNDepthChart = { positions?: Record<string, ESPNDepthPosition> };
type ESPNPowerIndexItem = {
  team?: { $ref?: string };
  predictives?: ESPNStat[];
  stats?: ESPNStat[];
  lastUpdated?: string;
  runCutoffDate?: string;
};
type ESPNRankingEntry = {
  rank?: string | number;
  currentRating?: string | number;
  contestantId?: string | number;
  contestantName?: string;
};
export type ProviderResponse = ESPNStandingsNode & {
  pageCount?: string | number;
  items?: ESPNPowerIndexItem[];
  sports?: {
    leagues?: { teams?: { team?: ESPNTeam }[] }[];
  }[];
  season?: ESPNSeason;
  leagues?: { season?: ESPNSeason; name?: string }[];
  depthchart?: ESPNDepthChart[];
  athletes?: ESPNRosterEntry[];
  seasons?: { id?: string | number; name?: string }[];
  current_season_id?: string | number;
  current_league_id?: string | number;
  [key: string]: unknown;
  division?: { type?: string; ranking?: ESPNRankingEntry[] }[];
  lastUpdated?: string;
};
type RankedTeam = {
  item: ESPNPowerIndexItem;
  teamId: string;
  rank: ESPNStat;
  metric: ESPNStat | undefined;
};
const seasonTypeNumber = (
  value: ESPNSeason["type"] | ESPNStandings["seasonType"],
) => Number(typeof value === "object" ? value?.type : value);
const safe = (s: string) => (/^https:\/\//.test(s) ? s : "");
const player = (p: ESPNAthlete, league: string) => ({
  name: p.displayName || p.fullName || p.name || "",
  url: safe(
    p.links?.find((l) => l.rel?.includes("playercard"))?.href ||
      p.links?.find((l) => l.href?.startsWith("https://www.espn.com/"))?.href ||
      "https://www.espn.com/" + league.split("/")[1] + "/player/_/id/" + p.id,
  ),
});
const powerRankingLeague = (league: string) =>
  ["football/nfl", "basketball/nba", "basketball/wnba"].includes(league);
const powerRankingTeamNames: Record<string, Record<string, string>> = {
  "basketball/nba": {
    "1": "Atlanta Hawks",
    "2": "Boston Celtics",
    "3": "New Orleans Pelicans",
    "4": "Chicago Bulls",
    "5": "Cleveland Cavaliers",
    "6": "Dallas Mavericks",
    "7": "Denver Nuggets",
    "8": "Detroit Pistons",
    "9": "Golden State Warriors",
    "10": "Houston Rockets",
    "11": "Indiana Pacers",
    "12": "Los Angeles Clippers",
    "13": "Los Angeles Lakers",
    "14": "Miami Heat",
    "15": "Milwaukee Bucks",
    "16": "Minnesota Timberwolves",
    "17": "Brooklyn Nets",
    "18": "New York Knicks",
    "19": "Orlando Magic",
    "20": "Philadelphia 76ers",
    "21": "Phoenix Suns",
    "22": "Portland Trail Blazers",
    "23": "Sacramento Kings",
    "24": "San Antonio Spurs",
    "25": "Oklahoma City Thunder",
    "26": "Utah Jazz",
    "27": "Washington Wizards",
    "28": "Toronto Raptors",
    "29": "Memphis Grizzlies",
    "30": "Charlotte Hornets",
  },
  "football/nfl": {
    "1": "Atlanta Falcons",
    "2": "Buffalo Bills",
    "3": "Chicago Bears",
    "4": "Cincinnati Bengals",
    "5": "Cleveland Browns",
    "6": "Dallas Cowboys",
    "7": "Denver Broncos",
    "8": "Detroit Lions",
    "9": "Green Bay Packers",
    "10": "Tennessee Titans",
    "11": "Indianapolis Colts",
    "12": "Kansas City Chiefs",
    "13": "Las Vegas Raiders",
    "14": "Los Angeles Rams",
    "15": "Miami Dolphins",
    "16": "Minnesota Vikings",
    "17": "New England Patriots",
    "18": "New Orleans Saints",
    "19": "New York Giants",
    "20": "New York Jets",
    "21": "Philadelphia Eagles",
    "22": "Arizona Cardinals",
    "23": "Pittsburgh Steelers",
    "24": "Los Angeles Chargers",
    "25": "San Francisco 49ers",
    "26": "Seattle Seahawks",
    "27": "Tampa Bay Buccaneers",
    "28": "Washington Commanders",
    "29": "Carolina Panthers",
    "30": "Jacksonville Jaguars",
    "33": "Baltimore Ravens",
    "34": "Houston Texans",
  },
  "basketball/wnba": {
    "3": "Dallas Wings",
    "5": "Indiana Fever",
    "6": "Los Angeles Sparks",
    "8": "Minnesota Lynx",
    "9": "New York Liberty",
    "11": "Phoenix Mercury",
    "14": "Seattle Storm",
    "16": "Washington Mystics",
    "17": "Las Vegas Aces",
    "18": "Connecticut Sun",
    "19": "Chicago Sky",
    "20": "Atlanta Dream",
    "129689": "Golden State Valkyries",
    "131935": "Toronto Tempo",
    "132052": "Portland Fire",
  },
};
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

const powerRankingFallback = (
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
const analystPremierLeaguePowerRankingsEndpoint =
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

async function parsePowerRanking(
  league: string,
  checked: string,
  get: (url: string, timeoutMs?: number) => Promise<ProviderResponse>,
): Promise<PowerRanking | undefined> {
  if (!powerRankingLeague(league)) return;
  const [sport, leagueName] = league.split("/");
  const now = new Date();
  const season =
    league === "basketball/nba" && now.getUTCMonth() >= 8
      ? now.getUTCFullYear() + 1
      : now.getUTCFullYear();
  const endpoint =
    `https://sports.core.api.espn.com/v2/sports/${sport}/leagues/${leagueName}` +
    `/seasons/${season}/powerindex?lang=en&region=us&page=1&limit=100`;
  const first = await get(endpoint, 30000);
  const pages = Number(first.pageCount) || 1;
  const values = [
    first,
    ...(await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
        get(endpoint.replace("page=1", `page=${i + 2}`), 30000),
      ),
    )),
  ].flatMap((page) => page.items || []);
  const ranked = values
    .map((item) => {
      const stats = item.predictives || item.stats || [];
      const rank = stats.find((stat) =>
        ["fpirank", "bpirank", "rank"].includes(stat.name || ""),
      );
      const metric = stats.find((stat) =>
        ["fpi", "bpi"].includes(stat.name || ""),
      );
      const teamId = String(item.team?.$ref || "").match(/\/teams\/(\d+)/)?.[1];
      if (!teamId || !rank?.value) return null;
      return { item, teamId, rank, metric };
    })
    .filter((entry): entry is RankedTeam => entry !== null)
    .sort((a, b) => Number(a.rank.value) - Number(b.rank.value));
  if (!ranked.length) return;
  // Use one team-catalog request instead of one slow request per row. The
  // catalog is fast enough for the Site worker timeout and keeps the panel
  // available when ESPN's individual team endpoints are delayed.
  let catalogResult: ProviderResponse = {};
  try {
    catalogResult = await get(
      `https://site.api.espn.com/apis/site/v2/sports/${league}/teams?limit=100`,
      30000,
    );
  } catch {
    // The rankings endpoint is authoritative; a catalog outage should not
    // collapse a full ranking to the one-team snapshot fallback.
  }
  const catalog = new Map(
    (catalogResult.sports?.[0]?.leagues?.[0]?.teams || []).flatMap(
      ({ team }) =>
        team?.id === undefined ? [] : [[String(team.id), team] as const],
    ),
  );
  const rows = ranked.map(({ teamId, rank, metric }) => {
    const team = catalog.get(teamId) || {};
    const url =
      team.links?.find((link) => link.rel?.includes("clubhouse"))?.href ||
      `https://www.espn.com/${leagueName}/team/_/id/${teamId}`;
    return {
      id: teamId,
      name:
        team.displayName ||
        team.name ||
        powerRankingTeamNames[league]?.[teamId] ||
        `Team ${teamId}`,
      url,
      logo: team.logo || team.logos?.[0]?.href,
      cells: [
        String(rank.displayValue || rank.value),
        String(metric?.displayValue || "—"),
      ],
    };
  });
  const metricName = league === "football/nfl" ? "FPI" : "BPI";
  const sourceUrl = `https://www.espn.com/${leagueName}/${metricName.toLowerCase()}`;
  const topRanked = ranked[0];
  if (!topRanked) return;
  const publishedAt =
    topRanked.item.lastUpdated || topRanked.item.runCutoffDate || checked;
  return {
    name: "ESPN Power Rankings",
    metric: metricName,
    rows,
    source: `ESPN ${metricName}`,
    url: sourceUrl,
    checked,
    publishedAt,
    note: `${season} season · all teams ranked by ${metricName}.`,
  };
}
export function parseDepth(
  x: ProviderResponse,
  league: string,
  checked: string,
  url: string,
): Depth | undefined {
  const groups: {
    position: string;
    players: { name: string; url: string; starter?: boolean }[];
  }[] = [];
  for (const chart of x.depthchart || []) {
    for (const [key, pos] of Object.entries(chart.positions || {})) {
      const players = (pos.athletes || [])
        .map((a, i) => ({
          ...player(a.athlete || a, league),
          starter:
            i === 0 && ["basketball/nba", "football/nfl"].includes(league),
        }))
        .filter((p) => p.name);
      if (players.length)
        groups.push({
          position:
            pos.position?.displayName ||
            pos.position?.abbreviation ||
            key.toUpperCase(),
          players,
        });
    }
  }
  return groups.length
    ? {
        label: "Depth chart",
        groups,
        source: "ESPN",
        url,
        checked,
        note: [
          x.season?.displayName,
          ["basketball/nba", "football/nfl"].includes(league)
            ? "Starter means first listed at that position in ESPN’s depth chart; game-day lineups can change."
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      }
    : undefined;
}
export function parseRoster(
  x: ProviderResponse,
  league: string,
  checked: string,
  url: string,
  teamId = "",
): Depth | undefined {
  const groups = new Map<
    string,
    ({ name: string; url: string } & RosterDetails)[]
  >();
  function add(a: ESPNRosterEntry, group?: string) {
    if (a.items) {
      for (const p of a.items)
        add(p, a.position?.displayName || a.position?.name || group);
      return;
    }
    const p = {
      ...player(a, league),
      ...rosterDetails(a, league, x.season?.year ?? "", checked, teamId),
    };
    if (!p.name) return;
    const k = a.position?.displayName || a.position?.name || group || "Roster";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p);
  }
  for (const a of x.athletes || []) add(a);
  return groups.size
    ? {
        label: "Roster",
        groups: [...groups].map(([position, players]) => ({
          position,
          players,
        })),
        source: "ESPN",
        url,
        checked,
        note: "Players grouped by position. Links open player bios and profiles.",
      }
    : undefined;
}
export function parseStandings(
  x: ProviderResponse,
  id: string,
  checked: string,
): Table[] {
  const team = teams.find((t) => t.id === id)!;
  const league = team.league;
  const result: Table[] = [];
  const cols = league.startsWith("soccer/")
    ? [
        ["P", "gamesPlayed"],
        ["W", "wins"],
        ["D", "ties", "draws"],
        ["L", "losses"],
        ["GD", "pointDifferential", "goalDifference"],
        ["PTS", "points"],
      ]
    : league === "hockey/nhl"
      ? [
          ["W", "wins"],
          ["L", "losses"],
          ["OTL", "otLosses", "overtimeLosses"],
          ["PTS", "points"],
        ]
      : league === "football/nfl"
        ? [
            ["W", "wins"],
            ["L", "losses"],
            ["T", "ties"],
            ["PCT", "winPercent"],
          ]
        : [
            ["W", "wins"],
            ["L", "losses"],
            ["PCT", "winPercent"],
            ["GB", "gamesBehind"],
          ];
  function walk(node: ESPNStandingsNode) {
    const standings = node.standings;
    const entries = standings?.entries || [];
    const owns = (e: ESPNStandingEntry) =>
      String(e.team?.id) === team.espn ||
      e.team?.abbreviation?.toLowerCase() === team.espn;
    // ESPN exposes conferences and divisions as separate standings nodes.
    // Keep each populated group for every sport; the UI sets the default expansion.
    if (standings && entries.length > 0) {
      const url =
        standings.links?.find((l) => l.href?.startsWith("https:"))?.href ||
        "https://www.espn.com/" + league.split("/")[1] + "/standings";
      result.push({
        name: node.name || x.name || "Standings",
        columns: ["#", ...cols.map((c) => c[0])],
        rows: entries.map((e, i) => {
          const stat = (names: string[]) => {
            const s = e.stats?.find((s) => names.includes(s.name || ""));
            return String(s?.displayValue ?? s?.value ?? "—");
          };
          const entryTeam = e.team!;
          return {
            id: String(entryTeam.id),
            name: entryTeam.displayName || entryTeam.name || "",
            url:
              entryTeam.links?.find((l) => l.rel?.includes("clubhouse"))
                ?.href || url,
            highlight: owns(e),
            cells: [
              stat(["playoffSeed", "rank"]) === "—"
                ? String(i + 1)
                : stat(["playoffSeed", "rank"]),
              ...cols.map((c) => stat(c.slice(1))),
            ],
          };
        }),
        source: "ESPN",
        url,
        checked,
        seasonType:
          Number(
            seasonTypeNumber(standings.seasonType) ||
              seasonTypeNumber(x.season?.type),
          ) || undefined,
        note: [
          standings.seasonDisplayName,
          Number(seasonTypeNumber(standings.seasonType)) === 1
            ? league.startsWith("soccer/")
              ? "Regular Season"
              : "Preseason"
            : Number(seasonTypeNumber(standings.seasonType)) === 2
              ? "Regular Season"
              : Number(seasonTypeNumber(standings.seasonType)) === 3
                ? "Postseason"
                : "",
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }
    for (const child of node.children || []) walk(child);
  }
  walk(x);
  return result.map((table) => decorateTable(table, id));
}
export async function fetchTeamInfo() {
  const checked = new Date().toISOString();
  const powerRankingCache = new Map<
    string,
    Promise<PowerRanking | undefined>
  >();
  const get = async (
    url: string,
    timeoutMs = 10000,
  ): Promise<ProviderResponse> => {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "application/json",
        "User-Agent": "WolvesAndFriends/1.0",
      },
      cache: "no-store",
    });
    if (!r.ok) throw Error();
    return (await r.json()) as ProviderResponse;
  };
  const getText = async (url: string) => {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(
        url.includes("eurohoops.net") ||
          url.includes("thepwhl.com") ||
          url.includes("lkl.lt")
          ? 30000
          : 10000,
      ),
      headers: {
        Accept: "text/html",
        "User-Agent": "WolvesAndFriends/1.0",
      },
    });
    if (!r.ok) throw Error(String(r.status));
    return r.text();
  };
  const getJsonp = async (
    params: Record<string, string>,
  ): Promise<ProviderResponse | ProviderResponse[]> => {
    const url = new URL("https://lscluster.hockeytech.com/feed/index.php");
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, value);
    const raw = await getText(url.href);
    const start = raw.indexOf("(");
    const end = raw.lastIndexOf(")");
    if (start < 0 || end <= start) throw Error("Invalid PWHL stats response");
    return JSON.parse(raw.slice(start + 1, end)) as
      ProviderResponse | ProviderResponse[];
  };
  return Promise.all(
    teams.map(async (t) => {
      const info: TeamInfo = { id: t.id, tables: [], unavailable: [] };
      if (t.league) {
        const base =
          "https://site.api.espn.com/apis/site/v2/sports/" +
          t.league +
          "/teams/" +
          t.espn;
        await Promise.all([
          (async () => {
            try {
              info.postseason = await fetchPostseason(t.league);
            } catch {
              info.unavailable.push("postseason");
            }
          })(),
          (async () => {
            try {
              const standingsUrl =
                "https://site.api.espn.com/apis/v2/sports/" +
                t.league +
                "/standings";
              const x = await get(standingsUrl);
              const parseTables = (value: ProviderResponse) =>
                parseStandings(value, t.id, checked);
              const currentTables = await parseTables(x);
              info.tables = currentTables;
              // During the postseason ESPN's default standings response switches
              // to playoff context. Keep the regular-season table too so the
              // final seeding and qualification lines remain visible.
              const seasonType = seasonTypeNumber(x.season?.type);
              if (seasonType === 3 && x.season?.year) {
                try {
                  const regular = await get(
                    standingsUrl +
                      "?season=" +
                      encodeURIComponent(String(x.season.year)) +
                      "&seasontype=2",
                  );
                  const regularTables = await parseTables(regular);
                  info.tables = [...regularTables, ...currentTables];
                } catch {
                  // Keep the postseason table if the historical lookup is unavailable.
                }
              }
              if (x.season?.startDate && x.season?.endDate)
                info.season = {
                  name:
                    x.season.displayName || String(x.season.year || "Season"),
                  start: x.season.startDate,
                  end: x.season.endDate,
                  source: "ESPN season calendar",
                  url:
                    "https://www.espn.com/" +
                    t.league.split("/")[1] +
                    "/schedule",
                  note: "Provider season window; may include preseason and postseason.",
                };
              if (!info.tables.length) info.unavailable.push("standings");
            } catch {
              info.unavailable.push("standings");
            }
          })(),
          (async () => {
            try {
              info.depth = parseRoster(
                await get(base + "/roster"),
                t.league,
                checked,
                "https://www.espn.com/" +
                  t.league.split("/")[1] +
                  "/team/roster/_/name/" +
                  t.espn,
                t.id,
              );
            } catch {}
            if (!info.depth) info.unavailable.push("roster");
          })(),
          (async () => {
            const rankingSource = teamProviders.find(
              (p) => p.team === t.id,
            )?.powerRankingSource;
            if (!powerRankingLeague(t.league!) && !rankingSource) return;
            try {
              if (rankingSource === "opta-epl") {
                info.powerRanking = parseAnalystPremierLeaguePowerRanking(
                  await get(analystPremierLeaguePowerRankingsEndpoint, 30000),
                  checked,
                );
              } else if (rankingSource === "cbs-mlb") {
                info.powerRanking = parseCbsMlbPowerRanking(
                  await getText("https://www.cbssports.com/mlb/powerrankings/"),
                  checked,
                );
              } else if (rankingSource === "cbs-nhl") {
                info.powerRanking = parseCbsNhlPowerRanking(
                  await getText("https://www.cbssports.com/nhl/powerrankings/"),
                  checked,
                );
              } else {
                const getRanking = powerRankingLeague(t.league!)
                  ? powerRankingCache.get(t.league!) ||
                    parsePowerRanking(t.league!, checked, get)
                  : Promise.resolve<PowerRanking | undefined>(undefined);
                powerRankingCache.set(t.league!, getRanking);
                info.powerRanking = await getRanking;
              }
              if (!info.powerRanking) {
                info.powerRanking = powerRankingFallback(
                  t.league!,
                  t.id,
                  checked,
                );
              }
              if (!info.powerRanking) info.unavailable.push("power rankings");
            } catch {
              info.powerRanking = powerRankingFallback(
                t.league!,
                t.id,
                checked,
              );
              if (!info.powerRanking) info.unavailable.push("power rankings");
            }
          })(),
        ]);
        if (!info.season) {
          try {
            const x = await get(
              "https://site.api.espn.com/apis/site/v2/sports/" +
                t.league +
                "/scoreboard",
            );
            const s = x.leagues?.[0]?.season;
            if (s?.startDate && s?.endDate)
              info.season = {
                name: s.displayName || String(s.year || "Season"),
                start: s.startDate,
                end: s.endDate,
                source: "ESPN season calendar",
                url:
                  "https://www.espn.com/" +
                  t.league.split("/")[1] +
                  "/schedule",
                note: "Provider season window; may include preseason and postseason.",
              };
          } catch {}
        }
      }
      await serverHooksFor(t.id)?.loadTeamInfo?.({
        info,
        checked,
        getText,
        getJsonp,
      });
      const fixedSeason = teamProviders.find((p) => p.team === t.id)?.season;
      if (fixedSeason) info.season = { ...fixedSeason };
      return info;
    }),
  );
}
