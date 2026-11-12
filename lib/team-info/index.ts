// Fetches and combines public standings, rosters, postseason, and team-season data.
import { decorateTable } from "./standings";
export { decorateTable, tableSeasonType } from "./standings";
import { teams } from "../teams/teams";
import { teamProviders } from "../teams/providers";
import { serverHooksFor } from "../teams/server";
import { fetchPostseason, type Postseason } from "../games/postseason";
import { rosterDetails, type RosterDetails } from "./roster-details";
import { parsePowerRanking, powerRankingLeague } from "./power-rankings";
import {
  analystPremierLeaguePowerRankingsEndpoint,
  parseAnalystPremierLeaguePowerRanking,
  parseCbsMlbPowerRanking,
  parseCbsNbaPowerRanking,
  parseCbsNflPowerRanking,
  parseCbsNhlPowerRanking,
  parseSimmonsMlsPowerRanking,
  powerRankingFallback,
  simmonsMlsPowerRankingsUrl,
} from "./power-ranking-fallbacks";
export {
  parseAnalystPremierLeaguePowerRanking,
  parseCbsMlbPowerRanking,
  parseCbsNbaPowerRanking,
  parseCbsNflPowerRanking,
  parseCbsNhlPowerRanking,
  parseSimmonsMlsPowerRanking,
} from "./power-ranking-fallbacks";
import type { Table, PowerRanking } from "./types";
export type { Table, PowerRanking } from "./types";
import type {
  ESPNAthlete,
  ESPNRosterEntry,
  ESPNSeason,
  ESPNStandingEntry,
  ESPNStandings,
  ESPNStandingsNode,
  ProviderResponse,
} from "./provider-types";
export type { ProviderResponse } from "./provider-types";
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
    if (!r.ok) throw Error("HTTP " + r.status);
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
              } else if (rankingSource === "cbs-nba") {
                info.powerRanking = parseCbsNbaPowerRanking(
                  await getText("https://www.cbssports.com/nba/powerrankings/"),
                  checked,
                );
              } else if (rankingSource === "cbs-nfl") {
                info.powerRanking = parseCbsNflPowerRanking(
                  await getText("https://www.cbssports.com/nfl/powerrankings/"),
                  checked,
                );
              } else if (rankingSource === "cbs-nhl") {
                info.powerRanking = parseCbsNhlPowerRanking(
                  await getText("https://www.cbssports.com/nhl/powerrankings/"),
                  checked,
                );
              } else if (rankingSource === "simmons-mls") {
                info.powerRanking = parseSimmonsMlsPowerRanking(
                  await getText(simmonsMlsPowerRankingsUrl),
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
                  "no ranked teams returned",
                );
              }
              if (!info.powerRanking) info.unavailable.push("power rankings");
            } catch (error) {
              info.powerRanking = powerRankingFallback(
                t.league!,
                t.id,
                checked,
                error instanceof Error
                  ? /^HTTP \d+$/.test(error.message)
                    ? error.message
                    : error.name
                  : undefined,
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
