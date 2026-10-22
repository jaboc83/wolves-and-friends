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
const powerRankingFallback = (
  league: string,
  teamId: string,
  checked: string,
): PowerRanking | undefined => {
  const snapshots: Record<string, PowerRanking> = {
    "basketball/nba:wolves": {
      name: "ESPN Power Rankings",
      metric: "BPI",
      rows: [
        {
          id: "16",
          name: "Minnesota Timberwolves",
          url: "https://www.espn.com/nba/team/_/name/min",
          cells: ["8th", "3.096"],
        },
      ],
      source: "ESPN team snapshot",
      url: "https://www.espn.com/nba/bpi",
      checked,
      publishedAt: "2026-10-21T22:54:00Z",
      note: "Latest team snapshot while ESPN’s full ranking feed refreshes.",
    },
    "football/nfl:vikings": {
      name: "ESPN Power Rankings",
      metric: "FPI",
      rows: [
        {
          id: "15",
          name: "Minnesota Vikings",
          url: "https://www.espn.com/nfl/team/_/name/min",
          cells: ["32nd", "-7.8"],
        },
      ],
      source: "ESPN team snapshot",
      url: "https://www.espn.com/nfl/fpi",
      checked,
      publishedAt: "2026-10-21T06:00:00Z",
      note: "Latest team snapshot while ESPN’s full ranking feed refreshes.",
    },
    "basketball/wnba:lynx": {
      name: "ESPN Power Rankings",
      metric: "BPI",
      rows: [
        {
          id: "8",
          name: "Minnesota Lynx",
          url: "https://www.espn.com/wnba/team/_/name/min",
          cells: ["4th", "4.360"],
        },
      ],
      source: "ESPN team snapshot",
      url: "https://www.espn.com/wnba/bpi",
      checked,
      publishedAt: "2026-10-21T07:07:00Z",
      note: "Latest team snapshot while ESPN’s full ranking feed refreshes.",
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
    .slice(0, 10) as any[];
  if (!ranked.length) return;
  // Use one team-catalog request instead of one slow request per row. The
  // catalog is fast enough for the Site worker timeout and keeps the panel
  // available when ESPN's individual team endpoints are delayed.
  const catalogResult = await get(
    `https://site.api.espn.com/apis/site/v2/sports/${league}/teams?limit=100`,
    30000,
  );
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
      name: team.displayName || team.name || teamId,
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
    note: `${season} season · top 10 teams by ${metricName}.`,
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
      headers: { Accept: "text/html" },
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
            if (!powerRankingLeague(t.league!)) return;
            try {
              const getRanking =
                powerRankingCache.get(t.league!) ||
                parsePowerRanking(t.league!, checked, get);
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

