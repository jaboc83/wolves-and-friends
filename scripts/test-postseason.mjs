import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", source)(
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
const { decorateTable, parseStandings, parseNHLStandings } = load(
  path.resolve("lib/team-info.ts"),
);
const { postseasonWindow, parsePostseason, fetchPostseason } = load(
  path.resolve("lib/postseason.ts"),
);
const base = {
  name: "Western Conference",
  columns: ["#"],
  rows: [],
  source: "ESPN",
  url: "https://www.espn.com/nba/standings",
  checked: "2026-10-19",
  cuts: [{ after: 6, label: "old cutoff" }],
  qualification: "old rule",
};
for (const id of [
  "wolves",
  "wild",
  "vikings",
  "twins",
  "loons",
  "lynx",
  "palace",
]) {
  for (const phase of [1, 3, undefined]) {
    const decorated = decorateTable({ ...base, seasonType: phase }, id);
    assert.equal(decorated.cuts.length, 0);
    assert.equal(decorated.qualification, "");
  }
}
assert.equal(
  decorateTable({ ...base, seasonType: 2 }, "wolves").cuts.length,
  2,
);
assert.equal(
  decorateTable(
    { ...base, note: "2026-27 · Preseason", seasonType: 2 },
    "wolves",
  ).cuts.length,
  0,
);
const raw = {
  season: { type: 1 },
  children: [
    {
      name: "Western Conference",
      standings: {
        seasonType: "1",
        seasonDisplayName: "2026-27",
        entries: [
          {
            team: {
              id: "16",
              abbreviation: "min",
              displayName: "Minnesota Timberwolves",
            },
            stats: [],
          },
        ],
      },
    },
  ],
};
assert.equal(parseStandings(raw, "wolves", "now")[0].seasonType, 1);
assert.equal(parseStandings(raw, "wolves", "now")[0].cuts.length, 0);
const nhl = {
  ...raw,
  children: [
    {
      ...raw.children[0],
      standings: {
        ...raw.children[0].standings,
        entries: [
          {
            team: {
              id: "30",
              abbreviation: "min",
              displayName: "Minnesota Wild",
            },
            stats: [],
          },
        ],
      },
    },
  ],
};
assert.equal(parseNHLStandings(nhl, { groups: [] }, "now").length, 1);
const season = {
  year: 2027,
  type: { type: 2 },
  displayName: "2026-27",
  startDate: "2026-09-30",
  endDate: "2027-06-26",
};
const current = { leagues: [{ season }] };
assert.equal(postseasonWindow(current, Date.parse("2026-10-19")), undefined);
assert.equal(
  postseasonWindow(
    { leagues: [{ season: { ...season, type: 1 } }] },
    Date.parse("2027-04-01"),
  ),
  undefined,
);
assert.equal(postseasonWindow(current, Date.parse("2027-08-01")), undefined);
const window = postseasonWindow(current, Date.parse("2027-04-01"));
assert.ok(window);
const event = (
  id,
  date,
  type = 3,
  state = "post",
  round = "West 1st Round",
  year = 2027,
) => ({
  id,
  date,
  season: { year, type },
  links: [{ href: "https://www.espn.com/nba/game/_/gameId/" + id }],
  competitions: [
    {
      notes: [{ headline: round + " - Game 1" }],
      status: { type: { state, shortDetail: "Final" } },
      series: {
        summary: "MIN leads 2-1",
        competitors: [
          { id: "16", wins: 2 },
          { id: "25", wins: 1 },
        ],
      },
      competitors: [
        { team: { id: "16", displayName: "Minnesota Timberwolves" } },
        { team: { id: "25", displayName: "Oklahoma City Thunder" } },
      ],
    },
  ],
});
const placeholder = event("placeholder", "2027-05-20", 3, "pre", "Finals");
placeholder.competitions[0].competitors[0].team = {
  id: "-1",
  displayName: "Wolves/Thunder",
};
assert.equal(
  parsePostseason({ events: [placeholder] }, window, "now"),
  undefined,
);
const parsed = parsePostseason(
  {
    events: [
      event("1", "2027-04-17"),
      event("2", "2027-04-19"),
      event("3", "2027-04-21", 3, "pre"),
      event("reg", "2027-04-11", 2),
      event("old", "2026-04-11", 3, "post", "Final", 2026),
      event("bad", "invalid"),
      event("4", "2027-05-01", 3, "pre", "West Semifinals"),
    ],
  },
  window,
  "2027-04-20",
);
assert.equal(parsed.rounds.length, 2);
assert.equal(parsed.rounds[0].matchups.length, 1);
assert.ok(parsed.rounds[0].matchups[0].url.endsWith("2"));
assert.equal(parsed.rounds[0].matchups[0].teams[0].value, "2");
const Insights = load(path.resolve("components/team-insights.tsx")).default;
const render = (revealResults) =>
  renderToStaticMarkup(
    createElement(Insights, {
      active: "wolves",
      data: [
        { id: "wolves", tables: [base], unavailable: [], postseason: parsed },
      ],
      revealResults,
    }),
  );
assert.ok(render(true).includes("MIN leads 2-1"));
assert.ok(!render(false).includes("MIN leads 2-1"));
assert.ok(render(false).includes("Results hidden"));
assert.ok(!render(false).includes("old cutoff"));
let calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url, options });
  return {
    ok: true,
    json: async () => ({ leagues: [{ season: { ...season, type: 1 } }] }),
  };
};
assert.equal(await fetchPostseason("basketball/nba"), undefined);
assert.equal(calls.length, 1);
assert.equal(calls[0].options.credentials, "omit");
assert.equal(calls[0].options.referrerPolicy, "no-referrer");
assert.equal(await fetchPostseason("soccer/eng.1"), undefined);
assert.equal(calls.length, 1);
console.log(
  "Season-aware qualification and confirmed postseason brackets passed.",
);
