// Tests the CBS power ranking fallback parsers.
import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAnalystPremierLeaguePowerRanking,
  parseCbsMlbPowerRanking,
  parseCbsNhlPowerRanking,
  powerRankingFallback,
} from "../lib/team-info/power-ranking-fallbacks.ts";
import type { ProviderResponse } from "../lib/team-info/provider-types.ts";

const checked = "2026-10-27T00:00:00.000Z";

test("CBS NHL parser keeps team names, ordinal ranks, and logos", () => {
  const names = [
    "Hurricanes",
    "Oilers",
    "Avalanche",
    "Golden Knights",
    "Lightning",
    "Mammoth",
    "Wild",
    "Rangers",
    "Panthers",
    "Senators",
  ];
  const html = `<table><tr><th>Rk</th><th>Team</th></tr>${names
    .map((name, index) => `<tr><td>${index + 1}</td><td>${name}</td></tr>`)
    .join("")}</table>`;
  const ranking = parseCbsNhlPowerRanking(html, checked);

  assert.equal(ranking?.rows.length, 10);
  assert.deepEqual(ranking?.rows[6], {
    id: "minnesota-wild",
    name: "Minnesota Wild",
    url: "https://www.cbssports.com/nhl/powerrankings/",
    logo: "/api/team-logo?league=hockey%2Fnhl&id=30",
    cells: ["7th"],
  });
});

test("CBS MLB parser normalizes the Twins name", () => {
  const names = [
    "Brewers",
    "Dodgers",
    "Rays",
    "Braves",
    "Cubs",
    "Padres",
    "Yankees",
    "Phillies",
    "Red Sox",
    "Twins",
  ];
  const html = `<table><tr><th>Rk</th><th>Team</th></tr>${names
    .map((name, index) => `<tr><td>${index + 1}</td><td>${name}</td></tr>`)
    .join("")}</table>`;
  const ranking = parseCbsMlbPowerRanking(html, checked);

  assert.equal(ranking?.rows.length, 10);
  assert.equal(ranking?.rows[9].name, "Minnesota Twins");
  assert.equal(
    ranking?.rows[9].logo,
    "/api/team-logo?league=baseball%2Fmlb&id=9",
  );
});

test("Opta parser requires and retains the global Power Ranking", () => {
  const response: ProviderResponse = {
    lastUpdated: "2026-10-26T00:00:00.000Z",
    division: [
      {
        type: "global",
        ranking: Array.from({ length: 10 }, (_, index) => ({
          rank: index + 1,
          currentRating: 10 - index / 10,
          contestantId: index + 1,
          contestantName: index === 0 ? "Crystal Palace" : `Club ${index}`,
        })),
      },
    ],
  };
  const ranking = parseAnalystPremierLeaguePowerRanking(response, checked);

  assert.equal(ranking?.rows.length, 10);
  assert.deepEqual(ranking?.rows[0].cells, ["1st", "10.0"]);
  assert.equal(ranking?.publishedAt, "2026-10-26T00:00:00.000Z");
});

test("cached fallback snapshots retain their published values", () => {
  const ranking = powerRankingFallback("basketball/nba", "wolves", checked);

  assert.equal(ranking?.name, "ESPN Power Rankings");
  assert.equal(ranking?.publishedAt, "2026-10-28T07:41:00Z");
  assert.equal(
    ranking?.rows.find((row) => row.id === "16")?.name,
    "Minnesota Timberwolves",
  );
  assert.deepEqual(
    ranking?.rows.find((row) => row.id === "16")?.cells,
    ["7th", "4.281"],
  );
});
