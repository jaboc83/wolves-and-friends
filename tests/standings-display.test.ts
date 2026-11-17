import assert from "node:assert/strict";
import test from "node:test";
import {
  clincherFlags,
  markPlayoffPositions,
  visibleTeamStandings,
  withDivisionRanks,
} from "../lib/team-info/standings-display.ts";
import type { Table } from "../lib/team-info/types.ts";

function table(name: string, rows: Table["rows"]): Table {
  return {
    name,
    seasonType: 2,
    columns: ["#", "W", "L"],
    rows,
    source: "ESPN",
    url: "https://www.espn.com/standings",
    checked: "2026-11-17T00:00:00.000Z",
  };
}

test("division tables use division-order ranks without changing their stats", () => {
  const division = table("NFC North", [
    {
      id: "MIN",
      name: "Minnesota Vikings",
      url: "https://www.espn.com/nfl/",
      cells: ["3", "8", "2"],
      highlight: true,
    },
    {
      id: "GB",
      name: "Green Bay Packers",
      url: "https://www.espn.com/nfl/",
      cells: ["7", "6", "4"],
    },
  ]);

  assert.deepEqual(
    withDivisionRanks(division, "NFC North").rows.map((row) => row.cells),
    [
      ["1", "8", "2"],
      ["2", "6", "4"],
    ],
  );
});

test("standings omit only conferences without the selected team", () => {
  const east = table("Eastern Conference", [
    {
      id: "BOS",
      name: "Boston",
      url: "https://www.espn.com/",
      cells: ["1", "8", "2"],
    },
  ]);
  const west = table("Western Conference", [
    {
      id: "MIN",
      name: "Minnesota",
      url: "https://www.espn.com/",
      cells: ["1", "8", "2"],
      highlight: true,
    },
  ]);
  const division = table("Central Division", []);
  const tourDivisions = table("MPO standings", []);

  assert.deepEqual(
    visibleTeamStandings([east, west, division, tourDivisions]).map(
      (item) => item.name,
    ),
    ["Western Conference", "Central Division", "MPO standings"],
  );
});

test("NFL marks division winners and the next three conference teams", () => {
  const conference = table("National Football Conference", [
    { id: "MIN", name: "Minnesota", url: "/", cells: ["1"], highlight: true },
    { id: "D2", name: "Division 2 winner", url: "/", cells: ["2"] },
    { id: "D3", name: "Division 3 winner", url: "/", cells: ["3"] },
    { id: "D4", name: "Division 4 winner", url: "/", cells: ["4"] },
    { id: "W1", name: "Wildcard 1", url: "/", cells: ["5"] },
    { id: "W2", name: "Wildcard 2", url: "/", cells: ["6"] },
    { id: "W3", name: "Wildcard 3", url: "/", cells: ["7"] },
    { id: "W4", name: "Outside", url: "/", cells: ["8"] },
  ]);
  const divisions = [
    table("NFC North", [
      { id: "MIN", name: "Minnesota", url: "/", cells: ["1"] },
      { id: "W1", name: "Wildcard 1", url: "/", cells: ["2"] },
    ]),
    table("NFC East", [
      { id: "D2", name: "Division 2 winner", url: "/", cells: ["1"] },
    ]),
    table("NFC South", [
      { id: "D3", name: "Division 3 winner", url: "/", cells: ["1"] },
    ]),
    table("NFC West", [
      { id: "D4", name: "Division 4 winner", url: "/", cells: ["1"] },
    ]),
  ];

  const marked = markPlayoffPositions(
    [conference],
    [conference, ...divisions],
    "football/nfl",
  );

  assert.deepEqual(
    marked.conferenceTables[0].rows.map((row) => [row.id, row.playoffPosition]),
    [
      ["MIN", "division"],
      ["D2", "division"],
      ["D3", "division"],
      ["D4", "division"],
      ["W1", "wildcard"],
      ["W2", "wildcard"],
      ["W3", "wildcard"],
      ["W4", undefined],
    ],
  );
});

test("NHL marks the top three in each division and two wild cards", () => {
  const conference = table("Western Conference", [
    { id: "MIN", name: "Minnesota", url: "/", cells: ["1"], highlight: true },
    ...["A1", "A2", "A3", "B1", "B2", "B3"].map((id) => ({
      id,
      name: id,
      url: "/",
      cells: ["2"],
    })),
    ...["WC1", "WC2", "OUT"].map((id) => ({
      id,
      name: id,
      url: "/",
      cells: ["3"],
    })),
  ]);
  const divisions = [
    table("Central Division", [
      ...["MIN", "A1", "A2"].map((id) => ({
        id,
        name: id,
        url: "/",
        cells: ["1"],
      })),
    ]),
    table("Pacific Division", [
      ...["B1", "B2", "B3"].map((id) => ({
        id,
        name: id,
        url: "/",
        cells: ["1"],
      })),
    ]),
  ];

  const marked = markPlayoffPositions(
    [conference],
    [conference, ...divisions],
    "hockey/nhl",
  );

  assert.deepEqual(
    marked.conferenceTables[0].rows.map((row) => [row.id, row.playoffPosition]),
    [
      ["MIN", "division"],
      ["A1", "division"],
      ["A2", "division"],
      ["A3", "wildcard"],
      ["B1", "division"],
      ["B2", "division"],
      ["B3", "division"],
      ["WC1", "wildcard"],
      ["WC2", undefined],
      ["OUT", undefined],
    ],
  );
});

test("playoff positions are not inferred for preseason or postseason tables", () => {
  const conference = table("National Football Conference", [
    { id: "MIN", name: "Minnesota", url: "/", cells: ["1"], highlight: true },
  ]);
  const divisions = [table("NFC North", conference.rows)];

  for (const seasonType of [1, 3, undefined]) {
    const marked = markPlayoffPositions(
      [{ ...conference, seasonType }],
      divisions,
      "football/nfl",
    );
    assert.equal(marked.conferenceTables[0].rows[0].playoffPosition, undefined);
  }
});

test("clincher codes distinguish playoff status from top-seed home advantage", () => {
  assert.deepEqual(clincherFlags("y", "football/nfl"), {
    playoffsClinched: true,
    homeAdvantageClinched: false,
  });
  assert.deepEqual(clincherFlags("*", "football/nfl"), {
    playoffsClinched: true,
    homeAdvantageClinched: true,
  });
  assert.deepEqual(clincherFlags("x", "hockey/nhl"), {
    playoffsClinched: true,
    homeAdvantageClinched: false,
  });
  assert.deepEqual(clincherFlags("", "hockey/nhl"), {
    playoffsClinched: false,
    homeAdvantageClinched: false,
  });
});
