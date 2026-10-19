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
  const module = { exports: {} };
  cache.set(file, module);
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
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
    module,
    module.exports,
  );
  return module.exports;
}
const { rosterDetails } = load(path.resolve("lib/roster-details.ts"));
const { parseRoster } = load(path.resolve("lib/team-info.ts"));
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
const { parsePlayerStats } = load(path.resolve("lib/player-stats.ts"));
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
const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url, options });
  if (url.includes("/roster"))
    return {
      ok: true,
      json: async () => ({
        team: { id: "16" },
        athletes: Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1) })),
      }),
    };
  if (url.endsWith("/athletes/2/stats")) throw Error("Unavailable player");
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
  assert.equal(payload.players.length, 6);
  assert.equal(payload.players[0].stats.values[0].value, "20.1");
  assert.equal(
    payload.players[0].stats.title,
    "2025-26 · Regular Season Averages",
  );
  assert.equal(payload.players[1].stats, undefined);
  assert.ok(calls.some((c) => String(c.url).endsWith("/athletes/1/stats")));
  const afterFirst = calls.length;
  await GET(new Request("https://local/api/roster-stats?batch=0"));
  assert.equal(
    calls.length,
    afterFirst,
    "shared cache prevents duplicate upstream fetches",
  );
  assert.ok(
    calls.every(
      (c) =>
        c.options.credentials === "omit" &&
        c.options.referrerPolicy === "no-referrer" &&
        !c.options.headers,
    ),
  );
} finally {
  globalThis.fetch = originalFetch;
}
const page = fs.readFileSync("app/page.tsx", "utf8"),
  start = page.indexOf('className="social-refresh"'),
  button = page.slice(start, page.indexOf("</button>", start));
assert.ok(button.includes('aria-label="Refresh latest social media"'));
assert.ok(button.includes("aria-busy={socialRefreshing}"));
assert.ok(button.includes("title="));
assert.ok(!button.includes('"Refreshing…" : "Refresh"'));
console.log(
  "Roster season stats, age, browser-only score preferences, safe defaults, modal semantics and icon refresh passed.",
);
