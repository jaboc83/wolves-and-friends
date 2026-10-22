import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url),
  cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule);
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", js)(
    (name) =>
      name.startsWith(".")
        ? load(
            [".ts", ".tsx"]
              .map((ext) => path.resolve(path.dirname(file), name + ext))
              .find((f) => fs.existsSync(f)),
          )
        : require(name),
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}
const { rosterDetails } = load(path.resolve("lib/team-info/roster-details.ts"));
const { parseRoster } = load(path.resolve("lib/team-info/index.ts"));
const season = { year: 2027, displayName: "2026-27" };
const athlete = {
  id: "4594268",
  displayName: "Anthony Edwards",
  dateOfBirth: "2001-08-05T07:00Z",
  debutYear: 2020,
  age: 99,
  contract: { salary: 48000000, season: { year: 2027 } },
  contracts: [{ salary: 40000000, season: { year: 2026 } }],
  position: { displayName: "Guard" },
};
const before = rosterDetails(
  athlete,
  "basketball/nba",
  season,
  "2026-08-05T04:59:00Z",
  "wolves",
);
const after = rosterDetails(
  athlete,
  "basketball/nba",
  season,
  "2026-08-05T05:01:00Z",
  "wolves",
);
assert.equal(before.age, 24);
assert.equal(after.age, 25);
assert.equal(after.salary, undefined);
assert.equal(after.joined, undefined);
assert.equal(
  rosterDetails({ age: 31 }, "football/nfl", {}, "2026-10-19", "vikings").age,
  31,
);
const flat = parseRoster(
  { season, athletes: [athlete] },
  "basketball/nba",
  "2026-10-19T17:00:00Z",
  "https://www.espn.com/nba/team/roster/_/name/min",
  "wolves",
);
assert.equal(flat.groups[0].players[0].age, 25);
const nested = parseRoster(
  { season, athletes: [{ position: "Offense", items: [athlete] }] },
  "football/nfl",
  "2026-10-19T17:00:00Z",
  "https://www.espn.com/nfl/team/roster/_/name/min",
  "vikings",
);
assert.equal(nested.groups[0].players.length, 1);
assert.equal(nested.groups[0].players[0].joined, undefined);
const Insights = load(path.resolve("components/team-insights.tsx")).default;
const html = renderToStaticMarkup(
  createElement(Insights, {
    active: "wolves",
    data: [{ id: "wolves", tables: [], depth: flat, unavailable: [] }],
  }),
);
assert.ok(html.includes("Age 25"));
assert.ok(!html.includes("Joined"));
assert.ok(!html.includes("Salary"));
const { parsePlayerStats } = load(
  path.resolve("lib/team-info/player-stats.ts"),
);
const summary = (title, values) => ({
  athlete: {
    statsSummary: {
      displayName: title,
      statistics: values.map(([abbreviation, displayValue]) => ({
        abbreviation,
        displayValue,
      })),
    },
  },
});
const nba = parsePlayerStats(
  summary("2025-26 regular season stats", [
    ["PTS", "20.1"],
    ["REB", "4.8"],
    ["AST", "7.1"],
    ["FG%", "40.7"],
  ]),
);
assert.equal(nba.values[0].value, "20.1");
assert.equal(nba.title, "2025-26 regular season stats");
const currentSeason = parsePlayerStats({
  season: { displayName: "2026-27" },
  categories: [
    { name: "general", labels: ["GP", "PTS", "REB"], totals: ["0", "0", "0"] },
  ],
});
assert.equal(currentSeason.title, "2026-27");
assert.deepEqual(
  currentSeason.values.map((stat) => stat.label),
  ["GP", "PTS", "REB"],
);
const espnSeasonResponse = {
  categories: [
    {
      name: "averages",
      displayName: "Regular Season Averages",
      labels: ["GP", "PTS", "REB"],
      displayNames: ["Games Played", "Points Per Game", "Rebounds Per Game"],
      statistics: [
        {
          teamId: "16",
          season: { year: 2025, displayName: "2024-25" },
          stats: ["79", "25.8", "5.2"],
        },
        {
          teamId: "16",
          season: { year: 2026, displayName: "2025-26" },
          stats: ["61", "20.1", "4.8"],
        },
        {
          teamId: "30",
          season: { year: 2027, displayName: "2026-27" },
          stats: ["5", "22.0", "4.0"],
        },
      ],
      totals: ["140", "23.2", "5.0"],
    },
  ],
};
const espnStats = parsePlayerStats(espnSeasonResponse, "16");
assert.equal(espnStats.title, "2025-26 · Regular Season Averages");
assert.equal(espnStats.values[1].value, "20.1");
assert.equal(espnStats.values[0].description, "Games Played");
assert.equal(
  parsePlayerStats(summary("2026 career stats", [["PTS", "1"]])),
  undefined,
);
assert.equal(parsePlayerStats({}), undefined);
// Shapes captured from ESPN's actual Anthony Edwards responses. In
// particular, core uses splits.categories.stats and overview uses parallel
// labels/splits; neither is a common-v3 season-row array.
const coreSeason = {
  splits: {
    categories: [
      {
        name: "general",
        stats: [
          {
            name: "avgRebounds",
            abbreviation: "REB",
            displayValue: "5.0",
            displayName: "Rebounds Per Game",
          },
          { name: "gamesPlayed", abbreviation: "GP", displayValue: "61" },
        ],
      },
      {
        name: "offensive",
        stats: [
          {
            name: "avgPoints",
            abbreviation: "PTS",
            displayValue: "28.8",
            displayName: "Points Per Game",
          },
          { name: "avgAssists", abbreviation: "AST", displayValue: "3.7" },
          { name: "fieldGoalPct", abbreviation: "FG%", displayValue: "48.9" },
        ],
      },
    ],
  },
};
const core = parsePlayerStats({
  ...coreSeason,
  season: { displayName: "2026" },
});
assert.equal(core.title, "2026 · Regular season");
assert.deepEqual(
  core.values.map((s) => s.label),
  ["PTS", "REB", "AST", "FG%", "GP"],
);
assert.equal(core.values[0].value, "28.8");
const customizedBasketball = parsePlayerStats(
  {
    categories: [
      {
        name: "averages",
        displayName: "Regular Season Averages",
        labels: ["GP", "PTS", "REB", "AST", "BLK", "STL", "FG%", "3P%"],
        displayNames: [
          "Games Played",
          "Points Per Game",
          "Rebounds Per Game",
          "Assists Per Game",
          "Blocks Per Game",
          "Steals Per Game",
          "Field Goal Percentage",
          "3-Point Field Goal Percentage",
        ],
        stats: [
          {
            teamId: "16",
            season: { year: 2026, displayName: "2025-26" },
            stats: ["10", "20.1", "4.8", "7.1", "0.8", "0.9", "40.7", "35.2"],
          },
        ],
      },
    ],
  },
  "16",
  "basketball/nba",
  "Guard",
);
assert.deepEqual(
  customizedBasketball.values.map((s) => s.label),
  ["PTS", "REB", "AST", "STK", "FG%", "3P%"],
);
assert.equal(customizedBasketball.values[3].value, "1.7");
const customizedHockeyGoalie = parsePlayerStats(
  {
    splits: {
      categories: [
        {
          name: "goaltender",
          stats: [
            { name: "wins", abbreviation: "WINS", displayValue: "7" },
            { name: "losses", abbreviation: "L", displayValue: "3" },
            { name: "overtimeLosses", abbreviation: "OTL", displayValue: "1" },
            {
              name: "avgGoalsAgainst",
              abbreviation: "GAA",
              displayValue: "2.40",
            },
            { name: "savePct", abbreviation: "SV%", displayValue: ".912" },
            { name: "shutouts", abbreviation: "SO", displayValue: "2" },
          ],
        },
      ],
    },
    season: { displayName: "2026" },
  },
  "16",
  "hockey/nhl",
  "G",
);
assert.deepEqual(
  customizedHockeyGoalie.values.map((s) => s.label),
  ["W", "L", "OTL", "GAA", "SV%", "SO"],
);
const customizedHockeySkater = parsePlayerStats(
  {
    categories: [
      {
        name: "left-wing",
        displayName: "Regular Season",
        labels: ["GP", "G", "A", "PTS", "+/-", "SOG", "PPG", "SHG", "GWG"],
        names: [
          "games",
          "goals",
          "assists",
          "points",
          "plusMinus",
          "shootoutGoals",
          "powerPlayGoals",
          "shortHandedGoals",
          "gameWinningGoals",
        ],
        stats: [
          {
            teamId: "30",
            season: { year: 2026, displayName: "2025-26" },
            stats: ["55", "27", "24", "51", "10", "0", "8", "0", "3"],
          },
        ],
      },
    ],
  },
  "30",
  "hockey/nhl",
  "Left Wing",
);
assert.deepEqual(
  customizedHockeySkater.values.map((s) => s.label),
  ["G", "A", "PTS", "+/-"],
);
const customizedSoccer = parsePlayerStats(
  {
    splits: {
      categories: [
        {
          name: "offensive",
          stats: [
            { name: "totalGoals", abbreviation: "G", displayValue: "3" },
            { name: "assists", abbreviation: "A", displayValue: "2" },
            { name: "shots", abbreviation: "SH", displayValue: "14" },
            { name: "shotsOnGoal", abbreviation: "SOG", displayValue: "8" },
            { name: "foulsSuffered", abbreviation: "FA", displayValue: "5" },
          ],
        },
      ],
    },
    season: { displayName: "2026" },
  },
  "17362",
  "soccer/usa.1",
  "Forward",
);
assert.deepEqual(
  customizedSoccer.values.map((s) => s.label),
  ["G", "A", "SH", "SOG", "FS"],
);
const customizedSoccerGoalie = parsePlayerStats(
  {
    splits: {
      categories: [
        {
          name: "goalKeeping",
          stats: [
            { name: "saves", abbreviation: "SV", displayValue: "20" },
            { name: "cleanSheet", abbreviation: "CS", displayValue: "4" },
            { name: "goalsAgainst", abbreviation: "GA", displayValue: "6" },
          ],
        },
      ],
    },
    season: { displayName: "2026" },
  },
  "384",
  "soccer/eng.1",
  "Goalkeeper",
);
assert.deepEqual(
  customizedSoccerGoalie.values.map((s) => s.label),
  ["SV", "CS", "GA"],
);
const soccerOverview = (position, stats) =>
  parsePlayerStats(
    {
      statistics: {
        labels: [
          "STRT",
          "FC",
          "FA",
          "YC",
          "RC",
          "G",
          "A",
          "SHOT",
          "SOG",
          "OF",
          "CS",
          "SV",
          "GA",
        ],
        names: [
          "starts",
          "foulsCommitted",
          "foulsSuffered",
          "yellowCards",
          "redCards",
          "totalGoals",
          "goalAssists",
          "totalShots",
          "shotsOnTarget",
          "offsides",
          "cleanSheet",
          "saves",
          "goalsConceded",
        ],
        displayNames: [
          "Starts",
          "Fouls Committed",
          "Fouls Suffered",
          "Yellow Cards",
          "Red Cards",
          "Total Goals",
          "Assists",
          "Shots",
          "Shots On Goal",
          "Offsides",
          "Clean Sheet",
          "Saves",
          "Goals Against",
        ],
        splits: [
          {
            displayName: "2026 Leagues Cup",
            teamId: "17362",
            leagueSlug: "concacaf.leagues.cup",
            stats: Array(13).fill("99"),
          },
          {
            displayName: "2026 MLS",
            teamId: "17362",
            leagueSlug: "usa.1",
            stats,
          },
        ],
      },
    },
    "17362",
    "soccer/usa.1",
    position,
  );
const soccerOutfieldOverview = soccerOverview("Forward", [
  "4",
  "2",
  "7",
  "1",
  "0",
  "3",
  "2",
  "14",
  "8",
  "0",
  "0",
  "0",
  "0",
]);
assert.deepEqual(
  soccerOutfieldOverview.values.map((s) => [s.label, s.value]),
  [
    ["G", "3"],
    ["A", "2"],
    ["SH", "14"],
    ["SOG", "8"],
    ["FS", "7"],
  ],
);
const soccerGoalieOverview = soccerOverview("Goalkeeper", [
  "30",
  "0",
  "1",
  "1",
  "0",
  "0",
  "1",
  "0",
  "0",
  "0",
  "5",
  "95",
  "53",
]);
assert.deepEqual(
  soccerGoalieOverview.values.map((s) => [s.label, s.value]),
  [
    ["SV", "95"],
    ["CS", "5"],
    ["GA", "53"],
  ],
);
assert.equal(
  parsePlayerStats({ ...coreSeason, season: { displayName: "Career" } }),
  undefined,
);
const overviewStats = parsePlayerStats({
  statistics: {
    displayName: "Stats",
    labels: ["GP", "MIN", "FG%"],
    displayNames: ["Games Played", "Minutes Per Game", "Field Goal Percentage"],
    splits: [
      { displayName: "Career", stats: ["442", "34.8", "45.3"] },
      { displayName: "Regular Season", stats: ["61", "35.0", "48.9"] },
    ],
  },
});
assert.equal(overviewStats.values[0].value, "61");
assert.equal(overviewStats.values[1].description, "Minutes Per Game");
assert.equal(
  parsePlayerStats({
    statistics: {
      labels: ["PTS"],
      splits: [{ displayName: "Career", stats: ["24.6"] }],
    },
  }),
  undefined,
);
assert.equal(
  parsePlayerStats(summary("2026-27 English Premier League", [["CS", "0"]]))
    .values[0].value,
  "0",
);
const statsHtml = renderToStaticMarkup(
  createElement(Insights, {
    active: "wolves",
    data: [{ id: "wolves", tables: [], depth: flat, unavailable: [] }],
    playerStats: { "basketball/nba:4594268": nba },
  }),
);
assert.ok(statsHtml.includes("2025-26 regular season stats"));
assert.ok(statsHtml.includes("20.1"));
const { readPlayerStatsCache, writePlayerStatsCache } = load(
  path.resolve("lib/team-info/player-stats-cache.ts"),
);
const statsMemory = new Map();
const statsStorage = {
  getItem: (key) => statsMemory.get(key) ?? null,
  setItem: (key, value) => statsMemory.set(key, value),
};
writePlayerStatsCache(statsStorage, { "basketball/nba:4594268": nba }, 1000);
assert.deepEqual(readPlayerStatsCache(statsStorage, 2000), {
  "basketball/nba:4594268": nba,
});
assert.deepEqual(
  readPlayerStatsCache(statsStorage, 1000 + 12 * 60 * 60 * 1000 + 1),
  {},
);
statsStorage.setItem("wf-player-stats-cache-v2", "not json");
assert.deepEqual(readPlayerStatsCache(statsStorage, 2000), {});
const rosterStatsRouteSource = fs.readFileSync(
  path.resolve("app/api/roster-stats/route.ts"),
  "utf8",
);
assert.match(
  rosterStatsRouteSource,
  /entry\.league\.startsWith\("soccer\/"\)[\s\S]*\? \[commonBase \+ "\/overview"\]/,
);
assert.match(rosterStatsRouteSource, /commonBase \+ "\/overview"/);
const { loadScorePreference, saveScorePreference } = load(
  path.resolve("lib/score-preference.ts"),
);
const memory = new Map();
const storage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
};
assert.deepEqual(loadScorePreference(storage), { ask: true, hidden: true });
assert.equal(memory.size, 0);
saveScorePreference(storage, false, true);
assert.deepEqual(loadScorePreference(storage), { ask: true, hidden: true });
saveScorePreference(storage, false, false);
assert.deepEqual(loadScorePreference(storage), { ask: false, hidden: false });
saveScorePreference(storage, true, false);
assert.deepEqual(loadScorePreference(storage), { ask: false, hidden: true });
assert.deepEqual(
  loadScorePreference({
    getItem() {
      throw Error("Unavailable");
    },
  }),
  { ask: true, hidden: true },
);
const Dialog = load(
  path.resolve("components/score-preference-dialog.tsx"),
).default;
const dialogHtml = renderToStaticMarkup(
  createElement(Dialog, { open: false, onChoose: () => {} }),
);
assert.ok(dialogHtml.includes("Ask me this every time I visit"));
assert.ok(dialogHtml.includes('checked=""'));
assert.ok(dialogHtml.includes("aria-labelledby"));
const dialogCss = fs.readFileSync("app/globals.css", "utf8");
const dialogRule = dialogCss.slice(
  dialogCss.indexOf(".score-choice {"),
  dialogCss.indexOf(".score-choice::backdrop"),
);
assert.match(dialogRule, /position:\s*fixed/);
assert.match(dialogRule, /top:\s*50%/);
assert.match(dialogRule, /left:\s*50%/);
assert.match(dialogRule, /translate\(-50%,\s*-50%\)/);

const originalFetch = globalThis.fetch;
const originalDateNow = Date.now;
let now = 1_000_000;
Date.now = () => now;
const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url, options });
  if (url.includes("/roster"))
    return {
      ok: true,
      json: async () => ({
        team: { id: "16" },
        season: { year: 2027 },
        athletes: Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1) })),
      }),
    };
  if (url.includes("/athletes/2")) throw Error("Unavailable player");
  if (url.includes("sports.core.api.espn.com")) {
    if (url.includes("/seasons/2027/") || url.includes("/athletes/3/"))
      return { ok: false };
    return { ok: true, json: async () => coreSeason };
  }
  return {
    ok: true,
    json: async () => ({
      categories: [
        {
          name: "averages",
          displayName: "Regular Season Averages",
          labels: ["PTS"],
          statistics: [
            {
              teamId: "16",
              season: { year: 2026, displayName: "2025-26" },
              stats: ["20.1"],
            },
          ],
        },
      ],
    }),
  };
};
try {
  const { GET } = load(path.resolve("app/api/roster-stats/route.ts"));
  assert.equal(
    (await GET(new Request("https://local/api/roster-stats?batch=-1"))).status,
    400,
  );
  assert.equal(calls.length, 0);
  const response = await GET(
    new Request("https://local/api/roster-stats?batch=0", {
      headers: { cookie: "private", "user-agent": "private" },
    }),
  );
  const payload = await response.json();
  assert.equal(payload.players.length, 3);
  assert.equal(payload.players[0].stats.values[0].value, "20.1");
  assert.equal(
    payload.players[0].stats.title,
    "2025-26 · Regular Season Averages",
  );
  assert.equal(payload.players[1].stats, undefined);
  assert.ok(calls.some((c) => String(c.url).endsWith("/athletes/3/stats")));
  assert.ok(
    calls.some((c) => String(c.url).endsWith("/athletes/1/stats")),
    "responsive common-v3 stats are tried first",
  );
  const afterFirst = calls.length;
  await GET(new Request("https://local/api/roster-stats?batch=0"));
  assert.equal(
    calls.length,
    afterFirst,
    "shared cache prevents duplicate upstream fetches",
  );
  now += 2 * 60 * 1000 + 1;
  await GET(new Request("https://local/api/roster-stats?batch=0"));
  assert.equal(
    calls.filter((c) => String(c.url).endsWith("/athletes/2/stats")).length,
    2,
    "failed player stats retry after the short negative-cache window",
  );
  assert.ok(
    calls.every(
      (c) =>
        c.options.credentials === "omit" &&
        c.options.referrerPolicy === "no-referrer" &&
        c.options.headers?.Accept === "application/json, text/plain, */*" &&
        c.options.headers?.["User-Agent"].includes("WolvesAndFriends"),
    ),
  );
} finally {
  globalThis.fetch = originalFetch;
  Date.now = originalDateNow;
}
const page = fs.readFileSync("app/page.tsx", "utf8"),
  start = page.indexOf('className="social-refresh"'),
  button = page.slice(start, page.indexOf("</button>", start));
assert.ok(button.includes('aria-label="Refresh latest social media"'));
assert.ok(button.includes("aria-busy={socialRefreshing}"));
assert.ok(button.includes("title="));
const feeds = fs.readFileSync("hooks/use-dashboard-feeds.ts", "utf8");
const refreshBody =
  feeds.match(/function refresh\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
assert.ok(!refreshBody.includes("refreshRosterStats"));
assert.ok(!button.includes('"Refreshing…" : "Refresh"'));
console.log(
  "Roster season stats, age, browser-only score preferences, safe defaults, modal semantics and icon refresh passed.",
);
