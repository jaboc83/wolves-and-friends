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
assert.equal(after.salary.amount, 48000000);
assert.equal(after.salary.season, "2026-27");
assert.equal(after.joined.date, "2020-11-29");
assert.equal(
  rosterDetails(athlete, "basketball/nba", season, "2026-10-19", "lynx").joined,
  undefined,
);
assert.equal(
  rosterDetails(
    { ...athlete, contract: undefined },
    "basketball/nba",
    season,
    "2026-10-19",
    "wolves",
  ).salary,
  undefined,
);
assert.equal(
  rosterDetails(
    { ...athlete, contract: { salary: 0, season: { year: 2027 } } },
    "basketball/nba",
    season,
    "2026-10-19",
    "wolves",
  ).salary,
  undefined,
);
assert.equal(
  rosterDetails(athlete, "soccer/eng.1", season, "2026-10-19", "palace").salary,
  undefined,
);
assert.equal(
  rosterDetails(
    { age: 31, debutYear: 2015 },
    "football/nfl",
    {},
    "2026-10-19",
    "vikings",
  ).age,
  31,
);
assert.equal(
  rosterDetails(
    { id: "unknown", age: -1, debutYear: 2015, contract: { salary: 12000 } },
    "football/nfl",
    season,
    "2026-10-19",
    "vikings",
  ).joined,
  undefined,
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
assert.ok(html.includes("Joined Nov 29, 2020"));
assert.ok(html.includes("Salary (2026-27): $48,000,000"));
assert.ok(html.includes(after.joined.url));
assert.ok(html.includes('rel="noreferrer"'));
const page = fs.readFileSync("app/page.tsx", "utf8"),
  start = page.indexOf('className="social-refresh"'),
  button = page.slice(start, page.indexOf("</button>", start));
assert.ok(button.includes('aria-label="Refresh latest social media"'));
assert.ok(button.includes("aria-busy={socialRefreshing}"));
assert.ok(button.includes("title="));
assert.ok(!button.includes('"Refreshing…" : "Refresh"'));
console.log(
  "Roster details and icon refresh passed: birthday boundary, season-matched salary, source-linked joins, missing fields, nested feeds and accessible icon.",
);
