import assert from "node:assert/strict";
import test from "node:test";
import {
  combineVikingsRunningBackGroups,
  visibleRosterStatColumns,
} from "../lib/team-info/roster-stats-table.ts";

test("Vikings receiving and defensive tables use selected stat columns", () => {
  assert.deepEqual(
    visibleRosterStatColumns(
      "vikings",
      "football/nfl",
      "Wide Receiver",
      ["GP", "REC", "TGTS", "YDS", "AVG", "TD", "LNG", "QBR"],
    ),
    {
      columns: ["REC", "TGTS", "YDS", "AVG", "TD", "LNG"],
      positionOnly: false,
    },
  );
  assert.deepEqual(
    visibleRosterStatColumns(
      "vikings",
      "football/nfl",
      "Cornerback",
      ["TOT", "SOLO", "AST", "SACK", "FF", "FR", "PD"],
    ),
    {
      columns: ["TOT", "SOLO", "AST", "SACK", "FF", "FR"],
      positionOnly: false,
    },
  );
});

test("Vikings offensive line and long snapper tables keep position only", () => {
  assert.deepEqual(
    visibleRosterStatColumns("vikings", "football/nfl", "Offensive Tackle", [
      "TOT",
      "SOLO",
      "AST",
    ]),
    { columns: [], positionOnly: true },
  );
  assert.deepEqual(
    visibleRosterStatColumns("vikings", "football/nfl", "Left Guard", [
      "TOT",
    ]),
    { columns: [], positionOnly: true },
  );
  assert.deepEqual(
    visibleRosterStatColumns("vikings", "football/nfl", "Long Snapper", [
      "TOT",
    ]),
    { columns: [], positionOnly: true },
  );
});

test("position stat preferences do not change other teams or leagues", () => {
  assert.equal(
    visibleRosterStatColumns(
      "vikings",
      "basketball/nba",
      "Cornerback",
      ["TOT", "PD"],
    ).columns.join(","),
    "TOT,PD",
  );
  assert.equal(
    visibleRosterStatColumns(
      "wild",
      "football/nfl",
      "Cornerback",
      ["TOT", "PD"],
    ).columns.join(","),
    "TOT,PD",
  );
  assert.equal(
    visibleRosterStatColumns(
      "vikings",
      "football/nfl",
      "Quarterback",
      ["CMP", "YDS", "TD"],
    ).columns.join(","),
    "CMP,YDS,TD",
  );
});

test("only the Vikings NFL combines running back and fullback groups", () => {
  const groups = [
    { position: "Running Back", players: ["rb"] },
    { position: "Fullback", players: ["fb"] },
    { position: "Wide Receiver", players: ["wr"] },
  ];

  assert.deepEqual(
    combineVikingsRunningBackGroups(groups, "vikings", "football/nfl"),
    [
      {
        position: "Running Back / Fullback",
        players: ["rb", "fb"],
      },
      groups[2],
    ],
  );
  assert.deepEqual(
    combineVikingsRunningBackGroups(groups, "wild", "football/nfl"),
    groups,
  );
});
