import { decorateTable, tableSeasonType } from "./standings";
export { decorateTable, tableSeasonType } from "./standings";
import { teams } from "./teams";
import { fetchPostseason, type Postseason } from "./postseason";
import { rosterDetails, type RosterDetails } from "./roster-details";
import {
  parseEuroLeagueStandings,
  parseLklStandings,
  parseZalgirisRoster,
  parsePwhlRoster,
  parsePwhlStandings,
  parsePwhlTrainingCampRoster,
} from "./special-team-data";
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
const safe = (s: string) => (/^https:\/\//.test(s) ? s : "");
const player = (p: any, league: string) => ({
  name: p.displayName || p.fullName || p.name || "",
  url: safe(
    p.links?.find((l: any) => l.rel?.includes("playercard"))?.href ||
      p.links?.find((l: any) => l.href?.startsWith("https://www.espn.com/"))
        ?.href ||
      "https://www.espn.com/" + league.split("/")[1] + "/player/_/id/" + p.id,
  ),
});
const powerRankingLeague = (league: string) =>
  ["football/nfl", "basketball/nba", "basketball/wnba"].includes(league);
const powerRankingTeamNames: Record<string, Record<string, string>> = {
  "basketball/nba": {
    "1": "Atlanta Hawks", "2": "Boston Celtics", "3": "New Orleans Pelicans",
    "4": "Chicago Bulls", "5": "Cleveland Cavaliers", "6": "Dallas Mavericks",
    "7": "Denver Nuggets", "8": "Detroit Pistons", "9": "Golden State Warriors",
    "10": "Houston Rockets", "11": "Indiana Pacers", "12": "Los Angeles Clippers",
    "13": "Los Angeles Lakers", "14": "Miami Heat", "15": "Milwaukee Bucks",
    "16": "Minnesota Timberwolves", "17": "Brooklyn Nets", "18": "New York Knicks",
    "19": "Orlando Magic", "20": "Philadelphia 76ers", "21": "Phoenix Suns",
    "22": "Portland Trail Blazers", "23": "Sacramento Kings", "24": "San Antonio Spurs",
    "25": "Oklahoma City Thunder", "26": "Utah Jazz", "27": "Washington Wizards",
    "28": "Toronto Raptors", "29": "Memphis Grizzlies", "30": "Charlotte Hornets",
  },
  "football/nfl": {
    "1": "Atlanta Falcons", "2": "Buffalo Bills", "3": "Chicago Bears", "4": "Cincinnati Bengals",
    "5": "Cleveland Browns", "6": "Dallas Cowboys", "7": "Denver Broncos", "8": "Detroit Lions",
    "9": "Green Bay Packers", "10": "Tennessee Titans", "11": "Indianapolis Colts", "12": "Kansas City Chiefs",
    "13": "Las Vegas Raiders", "14": "Los Angeles Rams", "15": "Miami Dolphins", "16": "Minnesota Vikings",
    "17": "New England Patriots", "18": "New Orleans Saints", "19": "New York Giants", "20": "New York Jets",
    "21": "Philadelphia Eagles", "22": "Arizona Cardinals", "23": "Pittsburgh Steelers", "24": "Los Angeles Chargers",
    "25": "San Francisco 49ers", "26": "Seattle Seahawks", "27": "Tampa Bay Buccaneers", "28": "Washington Commanders",
    "29": "Carolina Panthers", "30": "Jacksonville Jaguars", "33": "Baltimore Ravens", "34": "Houston Texans",
  },
  "basketball/wnba": {
    "3": "Dallas Wings", "5": "Indiana Fever", "6": "Los Angeles Sparks", "8": "Minnesota Lynx",
    "9": "New York Liberty", "11": "Phoenix Mercury", "14": "Seattle Storm", "16": "Washington Mystics",
    "17": "Las Vegas Aces", "18": "Connecticut Sun", "19": "Chicago Sky", "20": "Atlanta Dream",
    "129689": "Golden State Valkyries", "131935": "Toronto Tempo", "132052": "Portland Fire",
  },
};
const nbaBpiFallbackRows = [
  ["25", "1st", "9.252"], ["24", "2nd", "6.795"], ["18", "3rd", "4.330"],
  ["2", "4th", "4.008"], ["8", "5th", "3.909"], ["16", "6th", "3.905"],
  ["20", "7th", "3.754"], ["28", "8th", "3.701"], ["7", "9th", "3.287"],
  ["5", "10th", "2.933"], ["10", "11th", "2.804"], ["13", "12th", "1.738"],
  ["1", "13th", "0.815"], ["14", "14th", "0.721"], ["19", "15th", "0.657"],
  ["11", "16th", "0.492"], ["22", "17th", "0.487"], ["30", "18th", "0.234"],
  ["21", "19th", "-0.364"], ["9", "20th", "-1.914"], ["27", "21st", "-2.799"],
  ["26", "22nd", "-3.084"], ["6", "23rd", "-3.215"], ["29", "24th", "-3.662"],
  ["3", "25th", "-5.277"], ["12", "26th", "-5.863"], ["4", "27th", "-6.171"],
  ["15", "28th", "-6.359"], ["17", "29th", "-6.697"], ["23", "30th", "-8.415"],
].map(([id, rank, bpi]) => ({
  id,
  name: powerRankingTeamNames["basketball/nba"][id],
  url: `https://www.espn.com/nba/team/_/id/${id}`,
  cells: [rank, bpi],
}));
const nflFpiFallbackRows = [
  ["25", "1st", "6.5"], ["12", "2nd", "5.2"], ["2", "3rd", "4.6"],
  ["30", "4th", "4.0"], ["3", "5th", "3.7"], ["26", "6th", "3.4"],
  ["14", "7th", "2.9"], ["34", "8th", "2.7"], ["4", "9th", "2.4"],
  ["17", "10th", "2.4"], ["8", "11th", "2.2"], ["6", "12th", "1.7"],
  ["16", "13th", "1.6"], ["7", "14th", "1.3"], ["9", "15th", "1.3"],
  ["33", "16th", "0.5"], ["29", "17th", "-0.3"], ["23", "18th", "-0.9"],
  ["11", "19th", "-0.9"], ["27", "20th", "-0.9"], ["24", "21st", "-2.0"],
  ["13", "22nd", "-2.3"], ["28", "23rd", "-3.3"], ["1", "24th", "-3.3"],
  ["18", "25th", "-3.4"], ["20", "26th", "-4.2"], ["5", "27th", "-4.6"],
  ["21", "28th", "-4.7"], ["22", "29th", "-4.9"], ["10", "30th", "-5.9"],
  ["19", "31st", "-6.2"], ["15", "32nd", "-7.8"],
].map(([id, rank, fpi]) => ({
  id,
  name: powerRankingTeamNames["football/nfl"][id],
  url: `https://www.espn.com/nfl/team/_/id/${id}`,
  cells: [rank, fpi],
}));
const wnbaBpiFallbackRows = [
  ["20", "1st", "5.909"], ["129689", "2nd", "5.472"], ["17", "3rd", "4.458"],
  ["8", "4th", "4.366"], ["9", "5th", "3.815"], ["5", "6th", "3.504"],
  ["3", "7th", "2.432"], ["16", "8th", "0.404"], ["11", "9th", "-1.639"],
  ["6", "10th", "-2.300"], ["19", "11th", "-3.029"], ["14", "12th", "-5.013"],
  ["132052", "13th", "-5.237"], ["18", "14th", "-6.419"], ["131935", "15th", "-6.721"],
].map(([id, rank, bpi]) => ({
  id,
  name: powerRankingTeamNames["basketball/wnba"][id],
  url: `https://www.espn.com/wnba/team/_/id/${id}`,
  cells: [rank, bpi],
}));
const nhlSuper16Rows = [
  ["carolina-hurricanes", "Carolina Hurricanes", "1st", "222"],
  ["vegas-golden-knights", "Vegas Golden Knights", "2nd", "196"],
  ["edmonton-oilers", "Edmonton Oilers", "3rd", "175"],
  ["colorado-avalanche", "Colorado Avalanche", "4th", "174"],
  ["new-york-rangers", "New York Rangers", "5th", "154"],
  ["minnesota-wild", "Minnesota Wild", "6th", "138"],
  ["utah-mammoth", "Utah Mammoth", "7th", "125"],
  ["tampa-bay-lightning", "Tampa Bay Lightning", "8th", "107"],
  ["ottawa-senators", "Ottawa Senators", "9th", "99"],
  ["winnipeg-jets", "Winnipeg Jets", "10th", "98"],
  ["boston-bruins", "Boston Bruins", "11th", "94"],
  ["florida-panthers", "Florida Panthers", "12th", "66"],
  ["montreal-canadiens", "Montreal Canadiens", "13th", "64"],
  ["anaheim-ducks", "Anaheim Ducks", "14th", "51"],
  ["seattle-kraken", "Seattle Kraken", "15th", "48"],
  ["dallas-stars", "Dallas Stars", "16th", "40"],
].map(([id, name, rank, points]) => ({
  id,
  name,
  url: `https://www.nhl.com/team/${id}`,
  cells: [rank, points],
}));
const mlsPowerRankingRows = [
  ["nashville-sc", "Nashville SC"], ["st-louis-city-sc", "St. Louis CITY SC"],
  ["philadelphia-union", "Philadelphia Union"], ["vancouver-whitecaps-fc", "Vancouver Whitecaps FC"],
  ["inter-miami-cf", "Inter Miami CF"], ["chicago-fire-fc", "Chicago Fire FC"],
  ["fc-dallas", "FC Dallas"], ["charlotte-fc", "Charlotte FC"],
  ["san-jose-earthquakes", "San Jose Earthquakes"], ["seattle-sounders-fc", "Seattle Sounders FC"],
  ["new-england-revolution", "New England Revolution"], ["orlando-city", "Orlando City"],
  ["houston-dynamo-fc", "Houston Dynamo FC"], ["los-angeles-football-club", "Los Angeles Football Club"],
  ["colorado-rapids", "Colorado Rapids"], ["new-york-red-bulls", "Red Bull New York"],
  ["fc-cincinnati", "FC Cincinnati"], ["columbus-crew", "Columbus Crew"],
  ["new-york-city-football-club", "New York City Football Club"], ["la-galaxy", "LA Galaxy"],
  ["toronto-fc", "Toronto FC"], ["portland-timbers", "Portland Timbers"],
  ["san-diego-fc", "San Diego FC"], ["dc-united", "D.C. United"],
  ["real-salt-lake", "Real Salt Lake"], ["austin-fc", "Austin FC"],
  ["atlanta-united", "Atlanta United"], ["minnesota-united-fc", "Minnesota United"],
  ["sporting-kansas-city", "Sporting Kansas City"], ["cf-montreal", "CF Montréal"],
].map(([id, name], index) => ({
  id,
  name,
  url: `https://www.mlssoccer.com/clubs/${id}`,
  cells: [
    `${index + 1}${index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"}`,
    "",
  ],
}));
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
      publishedAt: "2026-10-22T07:40:00Z",
        note: "Cached full ESPN BPI snapshot; live ranking feed unavailable.",
    },
    "football/nfl:vikings": {
      name: "ESPN Power Rankings",
      metric: "FPI",
      rows: nflFpiFallbackRows,
      source: "ESPN FPI cached snapshot",
      url: "https://www.espn.com/nfl/fpi",
      checked,
      publishedAt: "2026-10-22T06:00:00Z",
      note: "Cached full ESPN FPI snapshot; live ranking feed unavailable.",
    },
    "basketball/wnba:lynx": {
      name: "ESPN Power Rankings",
      metric: "BPI",
      rows: wnbaBpiFallbackRows,
      source: "ESPN BPI cached snapshot",
      url: "https://www.espn.com/wnba/bpi",
      checked,
      publishedAt: "2026-10-22T07:06:00Z",
      note: "Cached full ESPN BPI snapshot; live ranking feed unavailable.",
    },
    "hockey/nhl:wild": {
      name: "NHL Super 16 Power Rankings",
      metric: "Points",
      rows: nhlSuper16Rows,
      source: "NHL Super 16 cached snapshot",
      url: "https://www.nhl.com/news/topic/super-16/super-16-nhl-power-rankings-october-15-2026",
      checked,
      publishedAt: "2026-10-14T00:00:00Z",
      note: "Cached NHL Super 16 snapshot; live article feed unavailable.",
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
  };
  return snapshots[`${league}:${teamId}`];
};


async function parsePowerRanking(
  league: string,
  checked: string,
  get: (url: string, timeoutMs?: number) => Promise<any>,
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
    .map((item: any) => {
      const stats = item.predictives || item.stats || [];
      const rank = stats.find((stat: any) =>
        ["fpirank", "bpirank", "rank"].includes(stat.name),
      );
      const metric = stats.find((stat: any) =>
        ["fpi", "bpi"].includes(stat.name),
      );
      const teamId = String(item.team?.$ref || "").match(/\/teams\/(\d+)/)?.[1];
      if (!teamId || !rank?.value) return null;
      return { item, teamId, rank, metric };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => Number(a.rank.value) - Number(b.rank.value))
    .slice() as any[];
  if (!ranked.length) return;
  // Use one team-catalog request instead of one slow request per row. The
  // catalog is fast enough for the Site worker timeout and keeps the panel
  // available when ESPN's individual team endpoints are delayed.
  let catalogResult: any = {};
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
    (catalogResult.sports?.[0]?.leagues?.[0]?.teams || [])
      .map((entry: any) => entry.team || entry)
      .map((team: any) => [String(team.id), team]),
  );
  const rows = ranked.map(({ teamId, rank, metric }) => {
    const team: any = catalog.get(teamId) || {};
    const url =
      team.links?.find((link: any) => link.rel?.includes("clubhouse"))?.href ||
      `https://www.espn.com/${leagueName}/team/_/id/${teamId}`;
    return {
      id: teamId,
      name: team.displayName || team.name || powerRankingTeamNames[league]?.[teamId] || `Team ${teamId}`,
      url,
      logo: team.logo || team.logos?.[0]?.href,
      cells: [String(rank.displayValue || rank.value), String(metric?.displayValue || "—")],
    };
  });
  const metricName = league === "football/nfl" ? "FPI" : "BPI";
  const sourceUrl = `https://www.espn.com/${leagueName}/${metricName.toLowerCase()}`;
  const publishedAt = ranked[0].item.lastUpdated || ranked[0].item.runCutoffDate;
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
  x: any,
  league: string,
  checked: string,
  url: string,
): Depth | undefined {
  const groups: {
    position: string;
    players: { name: string; url: string; starter?: boolean }[];
  }[] = [];
  for (const chart of x.depthchart || []) {
    for (const [key, pos] of Object.entries(chart.positions || {}) as [
      string,
      any,
    ][]) {
      const players = (pos.athletes || [])
        .map((a: any, i: number) => ({
          ...player(a.athlete || a, league),
          starter:
            i === 0 && ["basketball/nba", "football/nfl"].includes(league),
        }))
        .filter((p: any) => p.name);
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
  x: any,
  league: string,
  checked: string,
  url: string,
  teamId = "",
): Depth | undefined {
  const groups = new Map<
    string,
    ({ name: string; url: string } & RosterDetails)[]
  >();
  function add(a: any, group?: string) {
    if (a.items) {
      for (const p of a.items) add(p, a.position || group);
      return;
    }
    const p = {
      ...player(a, league),
      ...rosterDetails(a, league, x.season, checked, teamId),
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
export function parseStandings(x: any, id: string, checked: string): Table[] {
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
  function walk(node: any) {
    const entries = node.standings?.entries || [];
    const owns = (e: any) =>
      String(e.team?.id) === team.espn ||
      e.team?.abbreviation?.toLowerCase() === team.espn;
    if (entries.some(owns)) {
      const url =
        node.standings.links?.find((l: any) => l.href?.startsWith("https:"))
          ?.href ||
        "https://www.espn.com/" + league.split("/")[1] + "/standings";
      result.push({
        name: node.name || x.name,
        columns: ["#", ...cols.map((c) => c[0])],
        rows: entries.map((e: any, i: number) => {
          const stat = (names: string[]) => {
            const s = e.stats?.find((s: any) => names.includes(s.name));
            return s?.displayValue ?? String(s?.value ?? "—");
          };
          return {
            id: String(e.team.id),
            name: e.team.displayName || e.team.name,
            url:
              e.team.links?.find((l: any) => l.rel?.includes("clubhouse"))
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
            node.standings.seasonType?.type ??
              node.standings.seasonType ??
              x.season?.type?.type ??
              x.season?.type,
          ) || undefined,
        note: [
          node.standings.seasonDisplayName,
          Number(
            node.standings.seasonType?.type ?? node.standings.seasonType,
          ) === 1
            ? league.startsWith("soccer/")
              ? "Regular Season"
              : "Preseason"
            : Number(
                  node.standings.seasonType?.type ?? node.standings.seasonType,
                ) === 2
              ? "Regular Season"
              : Number(
                    node.standings.seasonType?.type ??
                      node.standings.seasonType,
                  ) === 3
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
const plain = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
export function parseDGPT(
  html: string,
  division: string,
  checked: string,
): Table {
  const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1] || "";
  const rows = [...tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .slice(0, 10)
    .flatMap((m) => {
      const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
        (c) => c[1],
      );
      const link = cells[2]?.match(
        /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/,
      );
      if (!link || cells.length < 4) return [];
      return [
        {
          id: link[1],
          name: plain(link[2]),
          url: "https://statmando.com" + link[1],
          cells: [plain(cells[0]), plain(cells[3])],
        },
      ];
    });
  const week = html.match(/Week:[\s\S]{0,250}?(202\d-\d{2})/)?.[1];
  return {
    name: "DGPT " + division + " · Top 10",
    columns: ["#", "Points"],
    rows,
    source: "DGPT standings · StatMando",
    url: "https://statmando.com/rankings/dgpt/" + division.toLowerCase(),
    checked,
    note: week ? "Standings week " + week : undefined,
  };
}
export async function fetchTeamInfo() {
  const checked = new Date().toISOString();
  const powerRankingCache = new Map<string, Promise<PowerRanking | undefined>>();
  const get = async (url: string, timeoutMs = 10000) => {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "application/json",
        "User-Agent": "WolvesAndFriends/1.0",
      },
      cache: "no-store",
    });
    if (!r.ok) throw Error();
    return r.json() as Promise<any>;
  };
  const getText = async (url: string) => {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(
        url.includes("eurohoops.net") || url.includes("thepwhl.com") || url.includes("lkl.lt")
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
  const getJsonp = async (params: Record<string, string>) => {
    const url = new URL("https://lscluster.hockeytech.com/feed/index.php");
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, value);
    const raw = await getText(url.href);
    const start = raw.indexOf("(");
    const end = raw.lastIndexOf(")");
    if (start < 0 || end <= start) throw Error("Invalid PWHL stats response");
    return JSON.parse(raw.slice(start + 1, end));
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
                "https://site.api.espn.com/apis/v2/sports/" + t.league + "/standings";
              const x = await get(standingsUrl);
              const parseTables = async (value: any) =>
                t.id === "wild"
                  ? parseNHLStandings(
                      value,
                      await get(
                        "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/groups",
                      ),
                      checked,
                    )
                  : parseStandings(value, t.id, checked);
              const currentTables = await parseTables(x);
              info.tables = currentTables;
              // During the postseason ESPN's default standings response switches
              // to playoff context. Keep the regular-season table too so the
              // final seeding and qualification lines remain visible.
              const seasonType = Number(
                x.season?.type?.type ?? x.season?.type,
              );
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
                  name: x.season.displayName,
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
            if (!powerRankingLeague(t.league!) && !["wild", "loons"].includes(t.id)) return;
            try {
              const getRanking = powerRankingLeague(t.league!)
                ? powerRankingCache.get(t.league!) || parsePowerRanking(t.league!, checked, get)
                : Promise.resolve<PowerRanking | undefined>(undefined);
              powerRankingCache.set(t.league!, getRanking);
              info.powerRanking = await getRanking;
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
                name: s.displayName,
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
      if (t.id === "disc") {
        await Promise.all(
          ["MPO", "FPO"].map(async (division) => {
            try {
              const r = await fetch(
                "https://statmando.com/rankings/dgpt/" + division.toLowerCase(),
                { signal: AbortSignal.timeout(10000) },
              );
              if (!r.ok) throw Error();
              const table = parseDGPT(await r.text(), division, checked);
              if (table.rows.length !== 10) throw Error();
              info.tables.push(table);
            } catch {
              info.unavailable.push(division + " standings");
            }
          }),
        );
        info.tables.sort((a, b) => (a.name.includes("MPO") ? -1 : 1));
        info.season = {
          name: "2026 DGPT",
          start: "2026-02-27",
          end: "2026-10-18",
          source: "DGPT official schedule",
          url: "https://www.dgpt.com/schedule/",
          note: "Tour opener through the Powerball Cup.",
        };
      }
      if (t.id === "zalgiris") {
        await Promise.all([
          (async () => {
            try {
              const table = parseEuroLeagueStandings(
                await getText("https://www.eurohoops.net/euroleague-standings/"),
                checked,
              );
              if (!table) throw Error("No standings table parsed");
              info.tables.push(table);
            } catch {
              info.unavailable.push("EuroLeague standings");
            }
          })(),
          (async () => {
            try {
              const table = parseLklStandings(
                await getText("https://en.lkl.lt/turnyrine-lentele"),
                checked,
              );
              if (!table) throw Error("No LKL standings table parsed");
              info.tables.push(table);
            } catch {
              info.unavailable.push("LKL standings");
            }
          })(),
          (async () => {
            try {
              info.depth = parseZalgirisRoster(
                await getText(
                  "https://www.be-basketball.com/team/zalgiris-kaunas/players",
                ),
                checked,
              );
              if (!info.depth) throw Error("No roster parsed");
            } catch {
              info.unavailable.push("roster");
            }
          })(),
        ]);
      }
      if (t.id === "frost") {
        await Promise.all([
          (async () => {
            try {
              const standingsPage = await getText(
                "https://www.thepwhl.com/en/stats/standings",
              );
              const appKey = standingsPage.match(/\bappKey\s*=\s*['\"]([^'\"]+)['\"]/i)?.[1];
              if (!appKey) throw Error("PWHL stats key not found");
              const siteId = standingsPage.match(/\bsite_id\s*=\s*(\d+)/i)?.[1] || "0";
              const bootstrapResult = await getJsonp({
                feed: "statviewfeed", view: "bootstrap", season: "latest",
                game_id: "", pageName: "teams", key: appKey, client_code: "pwhl",
                site_id: siteId, league_id: "", league_code: "", conference: "-1",
                division: "-1", lang: "en", callback: "wolvesFriendsCallback",
              });
              const bootstrap = Array.isArray(bootstrapResult)
                ? bootstrapResult[0]
                : bootstrapResult;
              const seasonId = String(bootstrap?.current_season_id || "");
              const leagueId = String(bootstrap?.current_league_id || "");
              const seasonName = bootstrap?.seasons?.find(
                (season: any) => String(season.id) === seasonId,
              )?.name || "current season";
              if (!seasonId || !leagueId) throw Error("PWHL season unavailable");
              const standingsResult = await getJsonp({
                feed: "statviewfeed", view: "teams", groupTeamsBy: "league",
                context: "overall", site_id: siteId, season: seasonId,
                special: "false", key: appKey, client_code: "pwhl",
                league_id: leagueId, conference: "-1", division: "undefined",
                sort: "points", order_direction: "normal", lang: "en",
                callback: "wolvesFriendsCallback",
              });
              const standings = parsePwhlStandings(
                `wolvesFriendsCallback(${JSON.stringify(standingsResult)})`,
                checked,
                seasonName,
              );
              if (!standings) throw Error("No PWHL standings parsed");
              info.tables.push(standings);
            } catch {
              info.unavailable.push("standings");
            }
          })(),
          (async () => {
            try {
              const rosterPage = await getText(
                "https://www.thepwhl.com/en/stats/roster/2/10?league=1",
              );
              info.depth = parsePwhlRoster(rosterPage, checked);
              if (!info.depth) {
                const trainingCampPage = await getText(
                  "https://www.thepwhl.com/en/teams/minnesota-frost/news/2026/october/07/minnesota-frost-announce-2026-27-training-camp-roster",
                );
                info.depth = parsePwhlTrainingCampRoster(trainingCampPage, checked);
              }
              if (!info.depth) throw Error("No Frost roster parsed");
            } catch {
              info.unavailable.push("roster");
            }
          })(),
        ]);
      }
      if (t.id === "frost")
        info.season = {
          name: "2026–27 regular season",
          start: "2026-12-05",
          end: "2027-04-18",
          source: "PWHL official announcement",
          url: "https://www.thepwhl.com/en/news/2026/october/02/pwhl-announces-2026-27-regular-season-schedule",
        };
      return info;
    }),
  );
}

export function parseNHLStandings(
  x: any,
  groups: any,
  checked: string,
): Table[] {
  const conference = parseStandings(x, "wild", checked)[0];
  if (!conference) return [];
  if (tableSeasonType(conference) !== 2) return [conference];
  const selected = groups.groups?.find((g: any) =>
    g.children?.some((d: any) =>
      d.teams?.some((t: any) => t.abbreviation?.toLowerCase() === "min"),
    ),
  );
  if (!selected?.children?.length) return [conference];
  const qualified = new Set<string>();
  const divisions: Table[] = selected.children.map((division: any) => {
    const ids = new Set((division.teams || []).map((t: any) => String(t.id)));
    const rows = conference.rows.filter((r) => ids.has(r.id));
    rows.slice(0, 3).forEach((r) => qualified.add(r.id));
    return decorateTable(
      {
        ...conference,
        name: division.name,
        rows: rows.map((r, i) => ({
          ...r,
          cells: [String(i + 1), ...r.cells.slice(1)],
        })),
        note: (conference.note || "") + " · Division rank",
      },
      "wild",
    );
  });
  const wildcard = decorateTable(
    {
      ...conference,
      name: selected.name + " · Wild Card",
      rows: conference.rows
        .filter((r) => !qualified.has(r.id))
        .map((r, i) => ({ ...r, cells: [String(i + 1), ...r.cells.slice(1)] })),
      note:
        (conference.note || "") +
        " · Remaining teams, excluding automatic division places",
    },
    "wild",
  );
  return [...divisions, wildcard];
}


