import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("../lib/team-info/player-stats.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const { parsePlayerStats } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const parse = (data) =>
  parsePlayerStats(data, "16", "basketball/nba", "G", 2027);
const category = {
  name: "averages",
  labels: ["GP", "PTS", "FG%"],
  names: ["gamesPlayed", "avgPoints", "fieldGoalPct"],
  totals: [50, 12, 42.3],
  statistics: [{ teamId: "16", season: { year: 2026 }, stats: [50, 12, 42.3] }],
};
assert.equal(
  parse({ categories: [category] }),
  undefined,
  "Prior-season rows must not fall back to totals",
);
assert.equal(
  parse({ categories: [{ ...category, statistics: [] }] }),
  undefined,
  "Totals alone are not season stats",
);
const current = (games) => ({
  categories: [
    {
      ...category,
      statistics: [
        { teamId: "16", season: { year: 2027 }, stats: [games, 0, 0] },
      ],
    },
  ],
});
assert.equal(parse(current(0)), undefined, "No appearances means no stats");
assert.equal(
  parse(current(1)).values.find((s) => s.label === "PTS").value,
  "0",
  "Keep real zero scoring games",
);
const statistics = [
  { name: "fieldGoalPct", abbreviation: "FG%", displayValue: "64.3" },
];
assert.equal(
  parse({ statsSummary: { statistics } }),
  undefined,
  "Reject seasonless summaries",
);
assert.equal(
  parse({ season: { year: 2026 }, statsSummary: { statistics } }),
  undefined,
  "Reject older summaries",
);
assert.equal(
  parse({ season: { year: 2027 }, statsSummary: { statistics } }).values[0]
    .value,
  "64.3",
);
assert.equal(
  parse({ splits: { categories: [{ stats: statistics }] } }),
  undefined,
  "Reject seasonless core stats",
);
assert.equal(
  parse({
    season: { year: 2027 },
    splits: {
      categories: [
        { stats: [{ name: "gamesPlayed", displayValue: "0" }, ...statistics] },
      ],
    },
  }),
  undefined,
);
assert.equal(
  parse({
    statistics: {
      labels: ["FG%"],
      splits: [{ teamId: "16", displayName: "Regular Season", stats: [62.5] }],
    },
  }),
  undefined,
  "Reject unverified overview season",
);
console.log("Player stats regression checks passed (10 assertions).");
