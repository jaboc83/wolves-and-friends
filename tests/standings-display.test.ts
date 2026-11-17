import assert from "node:assert/strict";
import test from "node:test";
import {
  visibleTeamStandings,
  withDivisionRanks,
} from "../lib/team-info/standings-display.ts";
import type { Table } from "../lib/team-info/types.ts";

function table(name: string, rows: Table["rows"]): Table {
  return {
    name,
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
