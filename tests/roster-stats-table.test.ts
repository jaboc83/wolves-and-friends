import assert from "node:assert/strict";
import test from "node:test";
import {
  combineVikingsDefensiveLineGroups,
  combineVikingsLinebackerAndDefensiveBackGroups,
  combineVikingsOffensiveLineGroups,
  combineVikingsReceiverGroups,
  combineVikingsRunningBackGroups,
  visibleRosterStatColumns,
  orderVikingsRosterGroups,
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
      "Receivers",
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

test("Vikings offensive line tables keep GP only", () => {
  assert.deepEqual(
    visibleRosterStatColumns("vikings", "football/nfl", "Offensive Tackle", [
      "GP",
      "TOT",
      "SOLO",
      "AST",
    ]),
    { columns: ["GP"], positionOnly: false },
  );
  assert.deepEqual(
    visibleRosterStatColumns("vikings", "football/nfl", "Left Guard", [
      "GP",
      "TOT",
    ]),
    { columns: ["GP"], positionOnly: false },
  );
  assert.deepEqual(
    visibleRosterStatColumns("vikings", "football/nfl", "Long Snapper", [
      "GP",
      "TOT",
    ]),
    { columns: ["GP"], positionOnly: false },
  );
  assert.deepEqual(
    visibleRosterStatColumns("vikings", "football/nfl", "Offensive Line", []),
    { columns: ["GP"], positionOnly: false },
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
      ["GP", "TOT", "PD"],
    ).columns.join(","),
    "TOT,PD",
  );
  assert.equal(
    visibleRosterStatColumns(
      "vikings",
      "football/nfl",
      "Quarterback",
      ["GP", "CMP", "YDS", "TD"],
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

test("Vikings offensive-line positions share one table", () => {
  const groups = [
    { position: "Quarterback", players: ["qb"] },
    { position: "Center", players: ["c"] },
    { position: "Long Snapper", players: ["ls"] },
    { position: "Offensive Tackle", players: ["ot"] },
    { position: "Right Tackle", players: ["rt"] },
    { position: "Left Guard", players: ["lg"] },
    { position: "Right Guard", players: ["rg"] },
    { position: "Wide Receiver", players: ["wr"] },
  ];

  const combined = combineVikingsOffensiveLineGroups(
    groups,
    "vikings",
    "football/nfl",
  );

  assert.deepEqual(combined, [
    groups[0],
    {
      position: "Offensive Line",
      players: ["c", "ls", "ot", "rt", "lg", "rg"],
    },
    groups[7],
  ]);
  assert.deepEqual(
    combineVikingsOffensiveLineGroups(groups, "wild", "football/nfl"),
    groups,
  );
  assert.deepEqual(
    visibleRosterStatColumns(
      "vikings",
      "football/nfl",
      "Offensive Line",
      ["GP", "TOT", "SACK"],
    ),
    { columns: ["GP"], positionOnly: false },
  );
});

test("Vikings wide receivers and tight ends share one Receivers table", () => {
  const groups = [
    { position: "Quarterback", players: ["qb"] },
    { position: "Wide Receiver", players: ["wr1", "wr2"] },
    { position: "Running Back", players: ["rb"] },
    { position: "Tight End", players: ["te"] },
  ];

  assert.deepEqual(
    combineVikingsReceiverGroups(groups, "vikings", "football/nfl"),
    [
      groups[0],
      {
        position: "Receivers",
        players: ["wr1", "wr2", "te"],
      },
      groups[2],
    ],
  );
  assert.deepEqual(
    combineVikingsReceiverGroups(groups, "wild", "football/nfl"),
    groups,
  );
});

test("Vikings defensive ends and tackles share a Defensive Line table", () => {
  const groups = [
    { position: "Quarterback", players: ["qb"] },
    { position: "Defensive End", players: ["de1", "de2"] },
    { position: "Cornerback", players: ["cb"] },
    { position: "Defensive Tackle", players: ["dt"] },
  ];

  assert.deepEqual(
    combineVikingsDefensiveLineGroups(groups, "vikings", "football/nfl"),
    [
      groups[0],
      {
        position: "Defensive Line",
        players: ["de1", "de2", "dt"],
      },
      groups[2],
    ],
  );
  assert.deepEqual(
    combineVikingsDefensiveLineGroups(groups, "wild", "football/nfl"),
    groups,
  );
  assert.deepEqual(
    visibleRosterStatColumns("vikings", "football/nfl", "Defensive Line", [
      "TOT",
      "SOLO",
      "AST",
      "SACK",
      "FF",
      "FR",
      "PD",
    ]),
    {
      columns: ["TOT", "SOLO", "AST", "SACK", "FF", "FR", "PD"],
      positionOnly: false,
    },
  );
});

test("Vikings linebackers, cornerbacks, and safeties share one table", () => {
  const groups = [
    { position: "Quarterback", players: ["qb"] },
    { position: "Outside Linebacker", players: ["olb"] },
    { position: "Cornerback", players: ["cb"] },
    { position: "Defensive End", players: ["de"] },
    { position: "Inside Linebacker", players: ["ilb"] },
    { position: "Safety", players: ["s"] },
  ];

  assert.deepEqual(
    combineVikingsLinebackerAndDefensiveBackGroups(
      groups,
      "vikings",
      "football/nfl",
    ),
    [
      groups[0],
      {
        position: "Linebackers and Defensive backs",
        players: ["olb", "cb", "ilb", "s"],
      },
      groups[3],
    ],
  );
  assert.deepEqual(
    combineVikingsLinebackerAndDefensiveBackGroups(
      groups,
      "wild",
      "football/nfl",
    ),
    groups,
  );
  assert.deepEqual(
    visibleRosterStatColumns(
      "vikings",
      "football/nfl",
      "Linebackers and Defensive backs",
      ["TOT", "SOLO", "AST", "SACK", "FF", "FR", "PD"],
    ),
    {
      columns: ["TOT", "SOLO", "AST", "SACK", "FF", "FR"],
      positionOnly: false,
    },
  );
});

test("Vikings roster tables follow the requested position order", () => {
  const groups = [
    { position: "Offensive Line", players: ["ol"] },
    { position: "Punter", players: ["p"] },
    { position: "Defensive Line", players: ["dl"] },
    { position: "Running Back / Fullback", players: ["rb"] },
    { position: "Place Kicker", players: ["k"] },
    { position: "Linebackers and Defensive backs", players: ["lbdb"] },
    { position: "Receivers", players: ["wrte"] },
    { position: "Quarterback", players: ["qb"] },
  ];

  assert.deepEqual(
    orderVikingsRosterGroups(groups, "vikings", "football/nfl").map(
      ({ position }) => position,
    ),
    [
      "Quarterback",
      "Receivers",
      "Running Back / Fullback",
      "Linebackers and Defensive backs",
      "Defensive Line",
      "Place Kicker",
      "Punter",
      "Offensive Line",
    ],
  );
  assert.deepEqual(
    orderVikingsRosterGroups(groups, "wild", "football/nfl"),
    groups,
  );
});
