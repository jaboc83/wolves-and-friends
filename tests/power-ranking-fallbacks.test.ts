// Tests the CBS power ranking fallback parsers.
import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAnalystPremierLeaguePowerRanking,
  parseCbsMlbPowerRanking,
  parseCbsNhlPowerRanking,
  parseSimmonsMlsPowerRanking,
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

test("CBS parser finds the rankings table after a large page preamble", () => {
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
  const html = `<script>// network work\n${"x".repeat(300000)}</script>
<table class="table-power-rankings"><thead><tr><th class="cell-left"><div>Rk</div></th><th class="cell-left"><div>Teams</div></th></tr></thead><tbody>${names
    .map(
      (name, index) =>
        `<tr class="team-rankings-stats"><td class="cell-left"><span class="rank"> ${index + 1} </span></td><td class="cell-left team"><a href="https://www.cbssports.com/nhl/teams/X/x/"><img alt="team logo"><span class="team-name"> ${name} </span></a></td><td class="cell-left dek"> Notes </td></tr>`,
    )
    .join("")}</tbody></table>`;
  const ranking = parseCbsNhlPowerRanking(html, checked);

  assert.equal(ranking?.rows.length, 10);
  assert.equal(ranking?.rows[6].name, "Minnesota Wild");
  assert.deepEqual(ranking?.rows[6].cells, ["7th"]);
});

test("Simmons MLS parser reads unclosed table cells and the update date", () => {
  const names = [
    "Nashville SC",
    "Vancouver Whitecaps",
    "Inter Miami CF",
    "FC Dallas",
    "St. Louis City SC",
    "New England Revolution",
    "Chicago Fire",
    "Los Angeles FC",
    "San Jose Earthquakes",
    "Minnesota United",
  ];
  const html = `<PRE><H3>
Last update:  Monday, October 26, 2026 - thru games of October 25
</H3></PRE>
<TABLE BORDER="0">
<TR><TD>	<TD>Team	<TD>W	<TD>L	<TD>T	<TD>Rating	<TD>LR
${names
  .map(
    (name, index) =>
      `<TR><TD>${index + 1}\t<TD>${name}\t<TD>8\t<TD>12\t<TD>11\t<TD>${(6 - index / 10).toFixed(2)}<TD>${index + 2}\n`,
  )
  .join("")}</TABLE>
<TABLE BORDER="0"><TR><TD>99<TD>Ignored<TD>0<TD>0<TD>0<TD>1.00</TABLE>`;
  const ranking = parseSimmonsMlsPowerRanking(html, checked);

  assert.equal(ranking?.rows.length, 10);
  assert.deepEqual(ranking?.rows[9], {
    id: "minnesota-united",
    name: "Minnesota United",
    url: "https://simmonsratings.com/prosoccer.htm",
    logo: "/api/team-logo?league=soccer%2Fusa.1&id=17362",
    cells: ["10th", "5.10"],
  });
  assert.equal(ranking?.publishedAt, "2026-10-26T12:00:00.000Z");
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
  assert.deepEqual(ranking?.rows.find((row) => row.id === "16")?.cells, [
    "7th",
    "4.281",
  ]);
});
