import { teams } from "./teams";
import { fetchPostseason, type Postseason } from "./postseason";
export type Table = {
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
export type Depth = {
  label: string;
  groups: {
    position: string;
    players: { name: string; url: string; starter?: boolean }[];
  }[];
  source: string;
  url: string;
  checked: string;
  note?: string;
};
export type TeamInfo = {
  postseason?: Postseason;
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
): Depth | undefined {
  const groups = new Map<string, { name: string; url: string }[]>();
  function add(a: any, group?: string) {
    if (a.items) {
      for (const p of a.items) add(p, a.position || group);
      return;
    }
    const p = player(a, league);
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
        note:
          node.standings.seasonDisplayName +
          (node.standings.seasonType === 1 ? " · Preseason" : ""),
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
  const get = async (url: string) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw Error();
    return r.json() as Promise<any>;
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
              const x = await get(
                "https://site.api.espn.com/apis/v2/sports/" +
                  t.league +
                  "/standings",
              );
              info.tables =
                t.id === "wild"
                  ? parseNHLStandings(
                      x,
                      await get(
                        "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/groups",
                      ),
                      checked,
                    )
                  : parseStandings(x, t.id, checked);
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
              );
            } catch {}
            if (!info.depth) info.unavailable.push("roster");
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

// Qualification lines use the table's rank scope, never a guessed division cutoff.
export function tableSeasonType(table: Table) {
  return /preseason|pre-season|spring training/i.test(table.note || "")
    ? 1
    : /postseason|post-season|playoffs/i.test(table.note || "")
      ? 3
      : (table.seasonType ??
        (/regular.?season/i.test(table.note || "") ? 2 : undefined));
}
export function decorateTable(table: Table, id: string): Table {
  const rows = [...table.rows].sort(
    (a, b) => Number(a.cells[0]) - Number(b.cells[0]),
  );
  const cuts: { after: number; label: string }[] = [];
  let qualification = "";
  // Legacy cached tables carry a note instead of structured season metadata.
  // Never apply qualification boundaries to preseason or postseason standings.
  if (tableSeasonType(table) !== 2)
    return { ...table, rows, cuts, qualification };
  if (id === "wolves") {
    cuts.push(
      { after: 6, label: "Direct playoff places end · 7–10 enter the Play-In" },
      { after: 10, label: "Play-In places end" },
    );
    qualification =
      "Regular-season format: top 6 in each conference qualify directly; 7–10 enter the Play-In.";
  }
  if (id === "vikings") {
    cuts.push(
      { after: 4, label: "Division-winner seeds end · 5–7 are wild cards" },
      { after: 7, label: "Playoff places end" },
    );
    qualification =
      "Conference playoff seeds: four division winners, then three wild cards. Positions are provisional until clinched.";
  }
  if (id === "twins") {
    cuts.push(
      { after: 3, label: "Division-winner seeds end · 4–6 are wild cards" },
      { after: 6, label: "Postseason places end" },
    );
    qualification =
      "League playoff seeds: three division winners and three wild cards.";
  }
  if (id === "loons") {
    cuts.push(
      { after: 7, label: "Direct Round One places end · 8–9 enter Wild Card" },
      { after: 9, label: "Playoff places end" },
    );
    qualification =
      "Top 9 per conference qualify: 1–7 enter Round One; 8–9 play the Wild Card match.";
  }
  if (id === "palace") {
    cuts.push({ after: 17, label: "Relegation zone · places 18–20" });
    qualification =
      "The bottom three are relegated at season end. European places vary with cup winners and UEFA allocations.";
  }
  if (id === "wild") {
    if (table.name.includes("Division"))
      cuts.push({ after: 3, label: "Automatic division playoff places end" });
    else if (table.name.includes("Wild Card"))
      cuts.push({ after: 2, label: "Wild-card playoff places end" });
    qualification =
      "NHL qualification: top 3 in each division plus 2 wild cards per conference. Division tables show automatic places; the wild-card table excludes the top 3 from each division. Positions are provisional until clinched.";
  }
  if (id === "lynx")
    qualification =
      "WNBA qualification: the top 8 across the entire league. This feed provides a conference table, so no conference cutoff is drawn.";
  return { ...table, rows, cuts, qualification };
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
