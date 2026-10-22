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
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule);
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", js)(
    (name) => {
      if (!name.startsWith(".")) return require(name);
      const base = path.resolve(path.dirname(file), name);
      return load(
        [base, base + ".ts", base + ".tsx"].find((f) => fs.existsSync(f)),
      );
    },
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}
const { parseMarchMadness, marchRound } = load(
  path.resolve("lib/march-madness.ts"),
);
const { marchMadnessYear } = load(path.resolve("lib/march-madness-config.ts"));
const snapshot = load(path.resolve("lib/march-madness-initial.json"));
assert.equal(snapshot.year, marchMadnessYear);
if (snapshot.year === 2026) {
  assert.equal(snapshot.games.length, 67);
  assert.equal(snapshot.games.filter((g) => g.completed).length, 67);
  assert.equal(
    snapshot.games.find((g) => g.order === 6).teams.find((t) => t.winner).name,
    "Michigan",
  );
}
if (snapshot.year === 2026)
  assert.ok(
    snapshot.games.every(
      (g) =>
        g.url.startsWith("https://www.espn.com/") &&
        g.teams.every(
          (t) =>
            t.url.startsWith("https://www.espn.com/") &&
            t.seed >= 1 &&
            t.seed <= 16,
        ),
    ),
  );
const fixture = (
  id,
  year,
  note = "NCAA Men's Basketball Championship - East Region - 1st Round",
) => ({
  id,
  date: `${year}-03-20T20:00Z`,
  season: { year, type: 3 },
  competitions: [
    {
      notes: [{ headline: note }],
      status: {
        type: { completed: false, state: "pre", shortDetail: "Scheduled" },
      },
      competitors: [
        {
          team: {
            id: "1",
            displayName: "Team One",
            links: [
              { rel: ["clubhouse"], href: "https://www.espn.com/team/1" },
            ],
          },
          curatedRank: { current: 1 },
          score: "0",
        },
        {
          team: { id: "2", displayName: "Team Two", links: [] },
          curatedRank: { current: 16 },
          score: "0",
        },
      ],
    },
  ],
  links: [{ rel: ["summary"], href: "https://www.espn.com/game/1" }],
});
const future = fixture("future", 2027);
const parsed = parseMarchMadness(
  [
    {
      events: [
        future,
        fixture("old", 2026),
        fixture("nit", 2027, "NIT - 1st Round"),
        fixture(
          "women",
          2027,
          "NCAA Women's Basketball Championship - 1st Round",
        ),
      ],
    },
    { events: [future] },
  ],
  2027,
  "now",
);
assert.equal(parsed.games.length, 1);
assert.equal(parsed.games[0].region, "East");
assert.equal(parsed.games[0].order, 1);
assert.equal(parsed.games[0].teams[0].score, undefined); // Scheduled zero is not a result.
assert.equal(marchRound("Opening round").order, 0);
const Panel = load(path.resolve("components/march-madness.tsx")).default;
const render = (revealResults) =>
  renderToStaticMarkup(
    createElement(Panel, { revealResults, onToggleResults() {} }),
  );
if (
  snapshot.games.some(
    (g) => g.order === 6 && g.completed && g.teams.some((t) => t.winner),
  )
)
  assert.ok(render(true).includes(snapshot.year + " champion:"));
assert.ok(render(true).includes(snapshot.games[0].teams[0].name));
assert.ok(
  render(true).includes("Game details") || render(true).includes("Box score"),
);
assert.ok(!render(false).includes(snapshot.year + " champion:"));
assert.ok(render(false).includes("Scores hidden"));
assert.ok(!render(false).includes('class="march-winner"'));
const route = load(path.resolve("app/api/march-madness/route.ts"));
globalThis.fetch = async () => {
  throw Error("Unavailable");
};
const response = await route.GET(),
  fallback = await response.json();
assert.equal(fallback.unavailable, true);
assert.equal(fallback.games.length, snapshot.games.length);
console.log(
  "March Madness: verified 2026 archive, tournament/year filtering, future field size, links, hidden results and feed failure passed.",
);
