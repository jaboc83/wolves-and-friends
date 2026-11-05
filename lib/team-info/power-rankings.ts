// Parses ESPN power index responses into ranked team rows with league team names.
import type {
  ESPNPowerIndexItem,
  ESPNStat,
  ProviderResponse,
} from "./provider-types";
import type { PowerRanking } from "./types";

type RankedTeam = {
  item: ESPNPowerIndexItem;
  teamId: string;
  rank: ESPNStat;
  metric: ESPNStat | undefined;
};

export const powerRankingLeague = (league: string) =>
  ["football/nfl", "basketball/nba", "basketball/wnba"].includes(league);

export const powerRankingTeamNames: Record<string, Record<string, string>> = {
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

export async function parsePowerRanking(
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
      Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
        get(endpoint.replace("page=1", `page=${index + 2}`), 30000),
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

  let catalogResult: ProviderResponse = {};
  try {
    catalogResult = await get(
      `https://site.api.espn.com/apis/site/v2/sports/${league}/teams?limit=100`,
      30000,
    );
  } catch {
    // The rankings endpoint remains useful if the team catalog is unavailable.
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
