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
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule);
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "loadedModule", "exports", compiled)(
    (name) =>
      name.startsWith(".")
        ? load(
            [".ts", ".tsx"]
              .map((ext) => path.resolve(path.dirname(file), name + ext))
              .find((candidate) => fs.existsSync(candidate)),
          )
        : require(name),
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}

const { createRosterStatsTable, rosterStatValue } = load(
  path.resolve("lib/roster-stats-table.ts"),
);
const stats = {
  "basketball/nba:101": {
    title: "2026-27 regular season",
    values: [
      { label: "PTS", value: "22.4", description: "Points per game" },
      { label: "AST", value: "6.1", description: "Assists per game" },
    ],
  },
  "basketball/nba:102": {
    title: "2026-27 regular season",
    values: [{ label: "PTS", value: "11.2", description: "Points per game" }],
  },
  "basketball/nba:103": {
    title: "2026-27 regular season",
    values: [
      { label: "REB", value: "9.3", description: "Rebounds per game" },
      { label: "BLK", value: "1.8", description: "Blocks per game" },
    ],
  },
};
const guards = createRosterStatsTable(
  [
    { name: "Guard Two", url: "https://www.espn.com/nba/player/_/id/102" },
    { name: "Guard One", url: "https://www.espn.com/nba/player/_/id/101" },
  ],
  "basketball/nba",
  stats,
);
const centers = createRosterStatsTable(
  [{ name: "Center One", url: "https://www.espn.com/nba/player/_/id/103" }],
  "basketball/nba",
  stats,
);
assert.deepEqual(guards.columns, ["PTS", "AST"]);
assert.deepEqual(centers.columns, ["REB", "BLK"]);
assert.equal(rosterStatValue(guards.rows[0].summary, "AST"), "—");

const TeamInsights = load(path.resolve("components/team-insights.tsx")).default;
const html = renderToStaticMarkup(
  createElement(TeamInsights, {
    active: "wolves",
    playerStats: stats,
    data: [
      {
        id: "wolves",
        tables: [],
        unavailable: [],
        depth: {
          source: "ESPN",
          url: "https://www.espn.com/nba/team/roster",
          checked: "2026-10-21T00:00:00Z",
          groups: [
            {
              position: "Guard",
              players: guards.rows.map(({ player }) => ({
                ...player,
                age: 25,
              })),
            },
            {
              position: "Center",
              players: centers.rows.map(({ player }) => player),
            },
          ],
        },
      },
    ],
  }),
);
assert.equal((html.match(/class="roster-stats-table"/g) || []).length, 2);
assert.ok(html.includes("Guard season stats"));
assert.ok(html.includes("Center season stats"));
assert.ok(html.includes('<th scope="col">AST</th>'));
assert.ok(html.includes('<th scope="col">REB</th>'));
assert.ok(html.includes("22.4"));
assert.ok(html.includes(">—</td>"));
assert.ok(html.indexOf("Guard One") < html.indexOf("Guard Two"));
assert.ok(html.indexOf(">Player</th>") < html.indexOf(">Pos.</th>"));
const css = fs.readFileSync(path.resolve("app/globals.css"), "utf8");
assert.match(
  css,
  /\.roster-stats-table tr > :nth-child\(2\)[^{]*\{[^}]*min-width:\s*44px/s,
);

console.log("Roster stats render in separate, comparable position tables.");
