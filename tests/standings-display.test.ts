import assert from "node:assert/strict";
import test from "node:test";
import {
  clincherFlags,
  markPlayoffPositions,
  standingsMarker,
  visibleTeamStandings,
  withDivisionRanks,
} from "../lib/team-info/standings-display.ts";
import type { Table } from "../lib/team-info/types.ts";
import { decorateTable } from "../lib/team-info/standings.ts";

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

test("clinch styling belongs to the position marker and preserves division and wild-card symbols", () => {
  assert.deepEqual(standingsMarker({ playoffPosition: "division" }), {
    symbol: "●",
    clinched: false,
    label: "Division playoff position",
  });
  assert.deepEqual(
    standingsMarker({ playoffPosition: "wildcard", playoffsClinched: true }),
    {
      symbol: "w",
      clinched: true,
      label: "Wild-card position · Playoffs clinched",
    },
  );
  assert.deepEqual(
    standingsMarker({ playoffPosition: "division", playoffsClinched: true }),
    {
      symbol: "●",
      clinched: true,
      label: "Division playoff position · Playoffs clinched",
    },
  );
});

test("clinched basketball teams get one dot without inventing provisional spots or restoring home indicators", () => {
  for (const flags of [
    { playoffsClinched: true },
    { homeAdvantageClinched: true },
  ]) {
    assert.deepEqual(standingsMarker(flags), {
      symbol: "●",
      clinched: true,
      label: "Playoffs clinched",
    });
  }
  assert.equal(standingsMarker({}), undefined);
  assert.equal(standingsMarker({ playoffsClinched: false }), undefined);
});

test("WNBA league standings remove the playoff cutoff, including from cached tables", () => {
  const league = table(
    "Women's National Basketball Assoc.",
    Array.from({ length: 15 }, (_, index) => ({
      id: String(index + 1),
      name: `Team ${index + 1}`,
      url: "/",
      cells: [String(index + 1), "20", "10"],
    })),
  );
  league.cuts = [{ after: 8, label: "Playoff places end" }];
  const decorated = decorateTable(league, "lynx");

  assert.deepEqual(decorated.cuts, []);
  assert.match(decorated.qualification || "", /top 8 across the entire league/);
  assert.equal(decorated.rows[7].cells[0], "8");
  assert.equal(decorated.rows[8].cells[0], "9");
});

test("NBA standings remove both playoff and Play-In cutoffs from cached tables", () => {
  const conference = table("Western Conference", []);
  conference.cuts = [
    { after: 6, label: "Direct playoff places end · 7–10 enter the Play-In" },
    { after: 10, label: "Play-In places end" },
  ];

  assert.deepEqual(decorateTable(conference, "wolves").cuts, []);
  for (const seasonType of [1, 3]) {
    assert.deepEqual(
      decorateTable({ ...conference, seasonType }, "wolves").cuts,
      [],
    );
  }
});

test("NBA conference positions distinguish playoff and Play-In spots without inferring clinches", () => {
  const conference = table(
    "Western Conference",
    Array.from({ length: 15 }, (_, index) => ({
      id: String(index + 1),
      name: `Team ${index + 1}`,
      url: "/",
      cells: [String(index + 1), "20", "10"],
    })),
  );
  const { rows } = decorateTable(conference, "wolves");

  assert.deepEqual(
    rows.map((row) => row.playoffPosition),
    [
      ...Array(6).fill("playoff"),
      ...Array(4).fill("playin"),
      ...Array(5).fill(undefined),
    ],
  );
  assert.deepEqual(standingsMarker(rows[0]), {
    symbol: "●",
    clinched: false,
    label: "Playoff position",
  });
  assert.deepEqual(standingsMarker(rows[6]), {
    symbol: "p",
    clinched: false,
    label: "Play-In position",
  });
  assert.equal(standingsMarker(rows[10]), undefined);
});

test("NBA position markers reject invalid ranks and clear cached markers outside regular-season conferences", () => {
  const conference = table("Western Conference", [
    {
      id: "MIN",
      name: "Minnesota",
      url: "/",
      cells: ["7", "20", "10"],
      playoffPosition: "playin",
    },
  ]);
  for (const other of [
    { ...conference, seasonType: 1 },
    { ...conference, seasonType: 3 },
    { ...conference, name: "Northwest Division" },
    { ...conference, name: "National Basketball Association" },
  ]) {
    assert.equal(
      decorateTable(other, "wolves").rows[0].playoffPosition,
      undefined,
    );
  }
  for (const rank of ["", "—", "0", "-1", "1.5", "11"]) {
    const invalid = {
      ...conference,
      rows: [{ ...conference.rows[0], cells: [rank, "20", "10"] }],
    };
    assert.equal(
      decorateTable(invalid, "wolves").rows[0].playoffPosition,
      undefined,
    );
  }
});

test("provider-confirmed NBA playoff clinches supersede provisional Play-In positions", () => {
  for (const flags of [
    { playoffsClinched: true },
    { homeAdvantageClinched: true },
  ]) {
    const conference = table("Western Conference", [
      {
        id: "MIN",
        name: "Minnesota",
        url: "/",
        cells: ["7", "20", "10"],
        ...flags,
      },
    ]);
    assert.deepEqual(
      standingsMarker(decorateTable(conference, "wolves").rows[0]),
      {
        symbol: "●",
        clinched: true,
        label: "Playoff position · Playoffs clinched",
      },
    );
  }
});

test("WNBA conference, preseason and postseason tables do not receive a league cutoff", () => {
  const league = table("Women's National Basketball Assoc.", []);
  for (const other of [
    { ...league, name: "Western Conference" },
    { ...league, seasonType: 1 },
    { ...league, seasonType: 3 },
  ]) {
    assert.deepEqual(decorateTable(other, "lynx").cuts, []);
  }
});

test("NBA clinchers distinguish playoff berths and conference home court from play-in berths", () => {
  for (const code of ["x", "xp", "y"]) {
    assert.deepEqual(clincherFlags(code, "basketball/nba"), {
      playoffsClinched: true,
      homeAdvantageClinched: false,
    });
  }
  assert.deepEqual(clincherFlags("z", "basketball/nba"), {
    playoffsClinched: true,
    homeAdvantageClinched: true,
  });
  assert.deepEqual(clincherFlags("pb", "basketball/nba"), {
    playoffsClinched: false,
    playInClinched: true,
    homeAdvantageClinched: false,
  });
  for (const code of ["", "e"]) {
    assert.deepEqual(clincherFlags(code, "basketball/nba"), {
      playoffsClinched: false,
      homeAdvantageClinched: false,
    });
  }
});

test("NBA Play-In clinches use a circled p without implying a clinched playoff berth", () => {
  for (const rank of ["5", "7"]) {
    const conference = table("Western Conference", [
      {
        id: "MIN",
        name: "Minnesota",
        url: "/",
        cells: [rank, "20", "10"],
        ...clincherFlags("pb", "basketball/nba"),
      },
    ]);
    const row = decorateTable(conference, "wolves").rows[0];
    assert.deepEqual(standingsMarker(row), {
      symbol: "p",
      clinched: true,
      label: "Play-In position · Play-In clinched",
    });
    assert.deepEqual(standingsMarker({ ...row, playoffsClinched: true }), {
      symbol: "●",
      clinched: true,
      label: "Playoff position · Playoffs clinched",
    });
  }
});

test("WNBA clinchers include Cup winners with playoff berths but reserve home court for best record", () => {
  for (const code of ["x", "cx"]) {
    assert.deepEqual(clincherFlags(code, "basketball/wnba"), {
      playoffsClinched: true,
      homeAdvantageClinched: false,
    });
  }
  assert.deepEqual(clincherFlags("*", "basketball/wnba"), {
    playoffsClinched: true,
    homeAdvantageClinched: true,
  });
  for (const code of ["", "e", "c"]) {
    assert.deepEqual(clincherFlags(code, "basketball/wnba"), {
      playoffsClinched: false,
      homeAdvantageClinched: false,
    });
  }
});

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

test("Twins standings retain the American League and division but omit the National League", () => {
  const twins = {
    id: "MIN",
    name: "Minnesota Twins",
    url: "/",
    cells: ["10"],
    highlight: true,
  };
  const american = table("American League", [twins]);
  const national = table("National League", [
    { ...twins, id: "MIL", name: "Milwaukee Brewers", highlight: false },
  ]);
  const central = table("American League Central", [twins]);

  assert.deepEqual(
    visibleTeamStandings([american, national, central]).map(
      (item) => item.name,
    ),
    ["American League", "American League Central"],
  );
});

test("MLB division ranks sort league seeds before numbering division places", () => {
  const division = table("American League Central", [
    { id: "CWS", name: "Chicago", url: "/", cells: ["6", "84", "78"] },
    { id: "CLE", name: "Cleveland", url: "/", cells: ["2", "85", "77"] },
    { id: "MIN", name: "Minnesota", url: "/", cells: ["10", "77", "85"] },
  ]);

  assert.deepEqual(
    withDivisionRanks(division, division.name).rows.map((row) => [
      row.id,
      row.cells,
    ]),
    [
      ["CLE", ["1", "85", "77"]],
      ["CWS", ["2", "84", "78"]],
      ["MIN", ["3", "77", "85"]],
    ],
  );
  assert.equal(division.rows[0].cells[0], "6");
});

test("MLB marks three division winners and three wild cards in the selected league", () => {
  const row = (id: string, seed: number) => ({
    id,
    name: id,
    url: "/",
    cells: [String(seed)],
    highlight: id === "MIN",
  });
  const american = table("American League", [
    row("TB", 1),
    row("CLE", 2),
    row("HOU", 3),
    row("NYY", 4),
    row("BOS", 5),
    row("CWS", 6),
    row("MIN", 10),
  ]);
  const national = table("National League", [row("MIL", 1)]);
  const divisions = [
    table("American League East", [row("NYY", 4), row("BOS", 5), row("TB", 1)]),
    table("American League Central", [
      row("CWS", 6),
      row("CLE", 2),
      row("MIN", 10),
    ]),
    table("American League West", [row("HOU", 3)]),
  ].map((division) => withDivisionRanks(division, division.name));

  const marked = markPlayoffPositions(
    [american, national],
    [american, ...divisions],
    "baseball/mlb",
  );

  assert.deepEqual(
    marked.conferenceTables[0].rows.map((item) => [
      item.id,
      item.playoffPosition,
    ]),
    [
      ["TB", "division"],
      ["CLE", "division"],
      ["HOU", "division"],
      ["NYY", "wildcard"],
      ["BOS", "wildcard"],
      ["CWS", "wildcard"],
      ["MIN", undefined],
    ],
  );
  assert.deepEqual(
    marked.divisionTables[2].rows.map((item) => [
      item.id,
      item.playoffPosition,
    ]),
    [
      ["CLE", "division"],
      ["CWS", "wildcard"],
      ["MIN", undefined],
    ],
  );
  assert.equal(marked.conferenceTables[1].rows[0].playoffPosition, undefined);
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

test("MLB clinchers distinguish division and wild-card clinches from home advantage", () => {
  for (const code of ["x", "y"]) {
    assert.deepEqual(clincherFlags(code, "baseball/mlb"), {
      playoffsClinched: true,
      homeAdvantageClinched: false,
    });
  }
  assert.deepEqual(clincherFlags("*", "baseball/mlb"), {
    playoffsClinched: true,
    homeAdvantageClinched: true,
  });
  for (const code of ["", "e"]) {
    assert.deepEqual(clincherFlags(code, "baseball/mlb"), {
      playoffsClinched: false,
      homeAdvantageClinched: false,
    });
  }
});
