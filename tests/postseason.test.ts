import assert from "node:assert/strict";
import test from "node:test";
import { fetchPostseason, parsePostseason } from "../lib/games/postseason.ts";
import { layoutPostseasonRounds } from "../lib/games/postseason-layout.ts";
import {
  completeMlsBracket,
  projectPostseason,
} from "../lib/games/postseason-projection.ts";

const range = (start: number, length: number) =>
  Array.from({ length }, (_, i) => start + i);

function matchup(id: string, teamIds: number[]) {
  return {
    id,
    url: `https://www.espn.com/game/${id}`,
    date: "2026-10-01T00:00:00Z",
    status: "Final",
    metric: "Series wins",
    teams: teamIds.map((id) => ({
      id: String(id),
      name: `Team ${id}`,
      logo: "",
    })),
  };
}

test("MLB groups parallel league stages and connects only the actual advancing paths", () => {
  const rounds = [
    { name: "NLWC", matchups: [matchup("c", [5, 6]), matchup("d", [7, 8])] },
    { name: "ALWC", matchups: [matchup("a", [1, 2]), matchup("b", [3, 4])] },
    { name: "ALDS", matchups: [matchup("e", [9, 1]), matchup("f", [3, 10])] },
    { name: "NLDS", matchups: [matchup("g", [5, 11]), matchup("h", [7, 12])] },
    { name: "NLCS", matchups: [matchup("j", [11, 12])] },
    { name: "ALCS", matchups: [matchup("i", [9, 10])] },
    { name: "World Series", matchups: [matchup("k", [9, 12])] },
  ];
  const original = structuredClone(rounds);
  const layout = layoutPostseasonRounds(rounds, "baseball/mlb");
  assert.deepEqual(
    layout.rounds.map((r) => [r.name, r.matchups.length]),
    [
      ["Wild Card Series", 4],
      ["Division Series", 4],
      ["League Championship", 2],
      ["World Series", 1],
    ],
  );
  assert.deepEqual(
    layout.rounds[0].matchups.map((m) => m.group),
    [
      "American League",
      "American League",
      "National League",
      "National League",
    ],
  );
  assert.deepEqual(layout.connections, [
    { from: "a", to: "e" },
    { from: "b", to: "f" },
    { from: "c", to: "g" },
    { from: "d", to: "h" },
    { from: "e", to: "i" },
    { from: "f", to: "i" },
    { from: "g", to: "j" },
    { from: "h", to: "j" },
    { from: "i", to: "k" },
    { from: "j", to: "k" },
  ]);
  assert.deepEqual(rounds, original);
});

test("WNBA feeders are reordered to match the actual semifinals, not scoreboard order", () => {
  const layout = layoutPostseasonRounds(
    [
      {
        name: "First Round",
        matchups: [
          matchup("a", [1, 2]),
          matchup("b", [3, 4]),
          matchup("c", [5, 6]),
          matchup("d", [7, 8]),
        ],
      },
      {
        name: "WNBA Semifinals",
        matchups: [matchup("e", [1, 5]), matchup("f", [3, 7])],
      },
      { name: "WNBA Finals", matchups: [matchup("g", [1, 7])] },
    ],
    "basketball/wnba",
  );
  assert.deepEqual(
    layout.rounds[0].matchups.map((m) => m.id),
    ["a", "c", "b", "d"],
  );
  assert.deepEqual(layout.connections.slice(0, 4), [
    { from: "a", to: "e" },
    { from: "c", to: "e" },
    { from: "b", to: "f" },
    { from: "d", to: "f" },
  ]);
});

test("bracket paths do not guess missing opponents or ambiguous progression", () => {
  const first = {
    name: "First Round",
    matchups: [matchup("a", [1, 2]), matchup("b", [3, 4])],
  };
  assert.deepEqual(
    layoutPostseasonRounds(
      [first, { name: "Second Round", matchups: [matchup("c", [1, 9])] }],
      "",
    ).connections,
    [{ from: "a", to: "c" }],
  );
  assert.deepEqual(
    layoutPostseasonRounds(
      [
        first,
        {
          name: "Second Round",
          matchups: [matchup("c", [1, 9]), matchup("d", [2, 10])],
        },
      ],
      "",
    ).connections,
    [],
  );
});

test("conference rounds occupy parallel stage columns without mixing their paths", () => {
  for (const [
    league,
    first,
    second,
    conferenceFinal,
    final,
    east,
    west,
    label,
  ] of [
    [
      "basketball/nba",
      "1st Round",
      "Semifinals",
      "Finals",
      "NBA Finals",
      "East",
      "West",
      "Eastern Conference",
    ],
    [
      "hockey/nhl",
      "1st Round",
      "2nd Round",
      "Final",
      "Stanley Cup Final",
      "East",
      "West",
      "Eastern Conference",
    ],
    [
      "football/nfl",
      "Wild Card Playoffs",
      "Divisional Playoffs",
      "Championship",
      "Super Bowl",
      "AFC",
      "NFC",
      "AFC",
    ],
  ]) {
    const layout = layoutPostseasonRounds(
      [
        { name: final, matchups: [matchup("g", [1, 3])] },
        {
          name: `${west} ${conferenceFinal}`,
          matchups: [matchup("f", [3, 8])],
        },
        {
          name: `${east} ${conferenceFinal}`,
          matchups: [matchup("e", [1, 7])],
        },
        { name: `${west} ${second}`, matchups: [matchup("d", [3, 6])] },
        { name: `${east} ${second}`, matchups: [matchup("c", [1, 5])] },
        { name: `${west} ${first}`, matchups: [matchup("b", [3, 4])] },
        { name: `${east} ${first}`, matchups: [matchup("a", [1, 2])] },
      ],
      league,
    );
    assert.deepEqual(
      layout.rounds.map((r) => r.matchups.length),
      [2, 2, 2, 1],
    );
    assert.equal(layout.rounds[3].name, final);
    assert.equal(layout.connections.length, 6);
    assert.equal(layout.rounds[0].matchups[0].group, label);
  }
});

function game(round: string, date: string, year: number, teams = [1, 2]) {
  return {
    date,
    season: { year, type: 3 },
    links: [{ href: `https://www.espn.com/game/${teams.join("-")}` }],
    status: { type: { state: "post", description: "Final" } },
    competitions: [
      {
        notes: [{ headline: `${round} - Game 1` }],
        competitors: teams.map((id) => ({
          team: { id: String(id), displayName: `Team ${id}` },
          score: "80",
        })),
      },
    ],
  };
}

const window = {
  year: 2026,
  name: "2026",
  start: "2026-04-03T07:00:00Z",
  end: "2026-11-05T07:59:00Z",
};

test("series winners require a completed series and an unambiguous series-win total", () => {
  for (const { completed, wins, expected } of [
    { completed: true, wins: ["1", "3"], expected: [false, true] },
    { completed: false, wins: [2, 0], expected: [false, false] },
    { completed: true, wins: [2, 2], expected: [false, false] },
    { completed: true, wins: [undefined, 3], expected: [false, false] },
  ]) {
    const event = game("WNBA Semifinals", "2026-10-10T00:00:00Z", 2026);
    const bracket = parsePostseason(
      {
        events: [
          {
            ...event,
            status: { type: { state: "post", completed: true } },
            competitions: event.competitions.map((competition) => ({
              ...competition,
              competitors: competition.competitors.map((team, index) => ({
                ...team,
                winner: index === 0,
              })),
              series: {
                completed,
                competitors: wins
                  .map((count, index) => ({
                    id: String(index + 1),
                    wins: count,
                  }))
                  .reverse(),
              },
            })),
          },
        ],
      },
      window,
      window.end,
      "basketball/wnba",
    );
    assert.deepEqual(
      bracket?.rounds[0].matchups[0].teams.map((team) => team.winner),
      expected,
    );
  }
});

test("single-game winners require a final game and a provider winner flag", () => {
  for (const { completed, winner, expected } of [
    { completed: true, winner: true, expected: [false, true] },
    { completed: false, winner: true, expected: [false, false] },
    { completed: true, winner: false, expected: [false, false] },
  ]) {
    const event = game("Wild Card", "2026-10-10T00:00:00Z", 2026);
    const bracket = parsePostseason(
      {
        events: [
          {
            ...event,
            status: { type: { state: completed ? "post" : "in", completed } },
            competitions: event.competitions.map((competition) => ({
              ...competition,
              competitors: competition.competitors.map((team, index) => ({
                ...team,
                winner: winner && index === 1,
              })),
            })),
          },
        ],
      },
      window,
      window.end,
      "football/nfl",
    );
    assert.deepEqual(
      bracket?.rounds[0].matchups[0].teams.map((team) => team.winner),
      expected,
    );
  }
});

test("WNBA retains all rounds after ESPN reverts the season phase to regular", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-11-17T17:00:00Z"),
  });
  const first = Array.from({ length: 4 }, (_, i) =>
    game("First Round", "2026-09-24T00:00:00Z", 2026, [i * 2 + 1, i * 2 + 2]),
  );
  const semifinals = [
    game("WNBA Semifinals", "2026-10-10T00:00:00Z", 2026, [1, 3]),
    game("WNBA Semifinals", "2026-10-10T00:00:00Z", 2026, [5, 7]),
  ];
  const finals = game("WNBA Finals", "2026-11-01T00:00:00Z", 2026, [1, 5]);
  const requested: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    const month = new URL(url).searchParams.get("dates");
    if (!month)
      return Response.json({
        leagues: [
          {
            season: {
              year: 2026,
              type: { type: 2 },
              startDate: "2026-04-03T07:00:00Z",
              endDate: "2026-11-05T07:59:00Z",
              displayName: "2026",
            },
          },
        ],
        events: [finals],
      });
    requested.push(month);
    return Response.json({
      events: month === "202609" ? first : month === "202610" ? semifinals : [],
    });
  });

  const bracket = await fetchPostseason("basketball/wnba");

  assert.deepEqual(
    bracket?.rounds.map((round) => [round.name, round.matchups.length]),
    [
      ["First Round", 4],
      ["WNBA Semifinals", 2],
      ["WNBA Finals", 1],
    ],
  );
  assert.equal(bracket?.partial, false);
  assert.ok(requested.includes("202609"));
  assert.ok(requested.includes("202610"));
  assert.ok(requested.every((month) => month >= "202604" && month <= "202611"));
});

test("NBA first-round history remains available during the postseason grace period", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-07-10T00:00:00Z"),
  });
  const first = game("First Round", "2026-04-18T00:00:00Z", 2026);
  const finals = game("NBA Finals", "2026-06-14T00:00:00Z", 2026);
  t.mock.method(globalThis, "fetch", async (url: string) => {
    const month = new URL(url).searchParams.get("dates");
    if (!month)
      return Response.json({
        leagues: [
          {
            season: {
              year: 2026,
              type: 3,
              startDate: "2025-10-01T00:00:00Z",
              endDate: "2026-06-30T00:00:00Z",
            },
          },
        ],
        events: [finals],
      });
    return Response.json({ events: month === "202604" ? [first] : [] });
  });

  const bracket = await fetchPostseason("basketball/nba");

  assert.deepEqual(
    bracket?.rounds.map((round) => round.name),
    ["First Round", "NBA Finals"],
  );
});

test("NBA projection builds a tentative bracket from conference standings", () => {
  const table = (name: string, base: number) => ({
    name,
    columns: [],
    seasonType: 2,
    source: "ESPN",
    url: "https://www.espn.com/nba/standings",
    checked: "2026-11-17T00:00:00Z",
    rows: Array.from({ length: 15 }, (_, i) => ({
      id: String(base + i),
      name: `Team ${base + i}`,
      url: "",
      cells: [String(i + 1)],
    })),
  });
  const projected = projectPostseason({
    league: "basketball/nba",
    tables: [
      table("Eastern Conference", 100),
      table("Western Conference", 200),
    ],
    checked: "2026-11-17T00:00:00Z",
  });
  assert.ok(projected?.projected);
  const layout = layoutPostseasonRounds(projected.rounds, "basketball/nba");
  assert.deepEqual(
    layout.rounds.map((r) => [r.name, r.matchups.length]),
    [
      ["First Round", 8],
      ["Conference Semifinals", 4],
      ["Conference Finals", 2],
      ["NBA Finals", 1],
    ],
  );
  assert.ok(layout.rounds.every((r) => r.matchups.every((m) => m.tentative)));
  assert.deepEqual(
    layout.rounds[0].matchups
      .slice(0, 4)
      .map((m) => m.teams.map((t) => t.seed)),
    [
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ],
  );
  // 8 + 4 + 2 feeder links.
  assert.equal(layout.connections.length, 14);
  assert.equal(
    projectPostseason({
      league: "basketball/nba",
      tables: [table("Eastern Conference", 100)],
      checked: "",
    }),
    undefined,
  );
});

const standingsTable = (
  name: string,
  ids: number[],
  seeds = ids.map((_, i) => i + 1),
) => ({
  name,
  columns: [],
  seasonType: 2,
  source: "ESPN",
  url: "https://www.espn.com/standings",
  checked: "2026-11-17T00:00:00Z",
  rows: ids.map((id, i) => ({
    id: String(id),
    name: `Team ${id}`,
    url: "",
    cells: [String(seeds[i])],
  })),
});

test("NFL projection gives the top seed a bye and links each round", () => {
  const projected = projectPostseason({
    league: "football/nfl",
    tables: [
      standingsTable("American Football Conference", range(100, 16)),
      standingsTable("National Football Conference", range(200, 16)),
    ],
    checked: "2026-11-17T00:00:00Z",
  });
  assert.ok(projected?.projected);
  const layout = layoutPostseasonRounds(projected.rounds, "football/nfl");
  assert.deepEqual(
    layout.rounds.map((r) => [r.name, r.matchups.length]),
    [
      ["Wild Card", 6],
      ["Divisional Round", 4],
      ["Conference Championship", 2],
      ["Super Bowl", 1],
    ],
  );
  const wildCard = layout.rounds[0].matchups.flatMap((m) =>
    m.teams.map((t) => t.seed),
  );
  assert.ok(!wildCard.slice(0, 6).includes(1));
  assert.equal(layout.connections.length, 6 + 4 + 2);
});

test("NHL projection seeds division winners against wild cards", () => {
  // East: Atlantic holds seeds 1, 3, 4, 6 and Metropolitan 2, 5, 7, 8; seeds 9+ miss out.
  const atlantic = standingsTable(
    "Atlantic Division",
    [101, 103, 104, 106],
    [1, 3, 4, 6],
  );
  const metro = standingsTable(
    "Metropolitan Division",
    [102, 105, 107, 108],
    [2, 5, 7, 8],
  );
  const central = standingsTable(
    "Central Division",
    [201, 203, 204, 206],
    [1, 3, 4, 6],
  );
  const pacific = standingsTable(
    "Pacific Division",
    [202, 205, 207, 208],
    [2, 5, 7, 8],
  );
  const conference = (name: string, base: number) =>
    standingsTable(name, range(base, 16));
  const input = {
    league: "hockey/nhl",
    tables: [
      conference("Eastern Conference", 101),
      conference("Western Conference", 201),
    ],
    checked: "2026-11-17T00:00:00Z",
  };
  assert.equal(projectPostseason(input), undefined);
  const projected = projectPostseason({
    ...input,
    divisions: [atlantic, metro, central, pacific],
  });
  assert.ok(projected?.projected);
  const layout = layoutPostseasonRounds(projected.rounds, "hockey/nhl");
  assert.deepEqual(
    layout.rounds.map((r) => [r.name, r.matchups.length]),
    [
      ["First Round", 8],
      ["Conference Semifinals", 4],
      ["Conference Finals", 2],
      ["Stanley Cup Finals", 1],
    ],
  );
  const first = layout.rounds[0].matchups.filter((m) =>
    m.id.startsWith("projected-east"),
  );
  assert.deepEqual(
    first.map((m) => m.teams.map((t) => t.seed)),
    [
      ["A1", "WC2"],
      ["A2", "A3"],
      ["M1", "WC1"],
      ["M2", "M3"],
    ],
  );
  assert.equal(layout.connections.length, 8 + 4 + 2);

  // A division table ranked locally (1–4) must not outrank a better conference seed.
  const westFirst = layoutPostseasonRounds(
    projectPostseason({
      ...input,
      divisions: [
        atlantic,
        metro,
        standingsTable("Central Division", [202, 205, 207, 208], [1, 2, 3, 4]),
        standingsTable("Pacific Division", [201, 203, 204, 206], [1, 3, 4, 6]),
      ],
    })!.rounds,
    "hockey/nhl",
  )
    .rounds[0].matchups.filter((m) => m.id.startsWith("projected-west"))
    .map((m) => m.teams.map((t) => t.seed));
  assert.deepEqual(westFirst[0], ["P1", "WC2"]);
});

test("MLB, WNBA, and MLS projections follow each league's playoff format", () => {
  const league = (name: string, base: number, size = 15) =>
    standingsTable(name, range(base, size));
  const ids = (base: number, ...offsets: number[]) =>
    offsets.map((o) => base + o - 1);

  const mlb = projectPostseason({
    league: "baseball/mlb",
    tables: [league("American League", 100), league("National League", 200)],
    divisions: [
      standingsTable("American League East", ids(100, 4, 1, 7, 9, 12)),
      standingsTable("American League Central", ids(100, 2, 5, 8, 10, 13)),
      standingsTable("American League West", ids(100, 3, 6, 11, 14, 15)),
      standingsTable("National League East", ids(200, 1, 4, 7, 10, 13)),
      standingsTable("National League Central", ids(200, 2, 5, 8, 11, 14)),
      standingsTable("National League West", ids(200, 3, 6, 9, 12, 15)),
    ],
    checked: "2026-06-01T00:00:00Z",
  });
  const mlbLayout = layoutPostseasonRounds(mlb!.rounds, "baseball/mlb");
  assert.deepEqual(
    mlbLayout.rounds.map((r) => [r.name, r.matchups.length]),
    [
      ["Wild Card Series", 4],
      ["Division Series", 4],
      ["League Championship", 2],
      ["World Series", 1],
    ],
  );
  // AL: division winners are seeds 1–3 and wild cards 4–6; seeds 1 and 2 have byes.
  assert.deepEqual(
    mlbLayout.rounds[0].matchups
      .filter((m) => m.id.startsWith("projected-al"))
      .map((m) => m.teams.map((t) => t.seed)),
    [
      [3, 6],
      [4, 5],
    ],
  );

  const wnba = projectPostseason({
    league: "basketball/wnba",
    tables: [league("Women's National Basketball Assoc.", 300)],
    checked: "",
  });
  assert.deepEqual(
    layoutPostseasonRounds(wnba!.rounds, "basketball/wnba").rounds.map((r) => [
      r.name,
      r.matchups.length,
    ]),
    [
      ["First Round", 4],
      ["WNBA Semifinals", 2],
      ["WNBA Finals", 1],
    ],
  );

  const mls = projectPostseason({
    league: "soccer/usa.1",
    tables: [
      { ...league("Eastern Conference", 400), seasonType: 1 },
      { ...league("Western Conference", 500), seasonType: 1 },
    ],
    checked: "",
  });
  const mlsLayout = layoutPostseasonRounds(mls!.rounds, "soccer/usa.1");
  assert.deepEqual(
    mlsLayout.rounds.map((r) => [r.name, r.matchups.length]),
    [
      ["Wild Card", 2],
      ["Round One", 8],
      ["Conference Semifinals", 4],
      ["Conference Finals", 2],
      ["MLS Cup", 1],
    ],
  );
  assert.equal(mlsLayout.connections.length, 2 + 8 + 4 + 2);
});

test("MLS playoffs use ESPN's per-round season slugs and tally Round One wins", () => {
  const mlsGame = (
    slug: string,
    date: string,
    winner: 0 | 1,
    teams = [1, 2],
  ) => ({
    date,
    season: { year: 2026, type: 13129, slug },
    links: [{ href: `https://www.espn.com/soccer/match/_/gameId/${date}` }],
    status: { type: { state: "post", completed: true, description: "FT" } },
    competitions: [
      {
        notes: [{ headline: "Series update" }],
        competitors: teams.map((id, index) => ({
          team: { id: String(id), displayName: `Team ${id}` },
          score: "1",
          winner: index === winner,
        })),
      },
    ],
  });
  const bracket = parsePostseason(
    {
      events: [
        mlsGame(
          "eastern-conference-playoffs---wild-card",
          "2026-10-22T00:00Z",
          0,
          [8, 9],
        ),
        mlsGame(
          "eastern-conference-playoffs---round-one",
          "2026-10-25T00:00Z",
          0,
        ),
        mlsGame(
          "eastern-conference-playoffs---round-one",
          "2026-11-01T00:00Z",
          0,
        ),
        mlsGame("regular-season", "2026-09-01T00:00Z", 0, [5, 6]),
      ],
    },
    { ...window, end: "2026-12-31T00:00:00Z" },
    "2026-11-05T00:00:00Z",
    "soccer/usa.1",
  );
  assert.deepEqual(
    bracket?.rounds.map((r) => r.name),
    ["East Wild Card", "East Round One"],
  );
  const series = bracket!.rounds[1].matchups[0];
  assert.deepEqual(
    series.teams.map((t) => [t.value, t.winner]),
    [
      ["2", true],
      ["0", false],
    ],
  );
});

test("an in-progress MLS bracket gains placeholders for unannounced rounds", () => {
  const conferences = [
    { label: "East", name: "Eastern Conference", base: 400 },
    { label: "West", name: "Western Conference", base: 500 },
  ];
  const tables = conferences.map((c) => ({
    ...standingsTable(c.name, range(c.base, 16)),
    seasonType: 1,
  }));
  const team = (id: number) => ({
    id: String(id),
    name: `Team ${id}`,
    logo: "",
  });
  const match = (id: string, a: number, b: number) => ({
    id,
    url: "https://www.espn.com/mls",
    date: "2026-11-20",
    status: "Scheduled",
    metric: "Best of 3",
    teams: [team(a), team(b)],
  });
  const real = {
    season: "2026",
    checked: "2026-11-17T00:00:00Z",
    rounds: [
      {
        name: "East Wild Card",
        matchups: [match("e-wc", 407, 408)],
      },
      {
        name: "West Wild Card",
        matchups: [match("w-wc", 507, 508)],
      },
      {
        name: "East Round One",
        matchups: [
          match("e-2", 401, 406),
          match("e-3", 402, 405),
          match("e-4", 403, 404),
        ],
      },
      {
        name: "West Round One",
        matchups: [
          match("w-2", 501, 506),
          match("w-3", 502, 505),
          match("w-4", 503, 504),
        ],
      },
    ],
  };
  const completed = completeMlsBracket(real, tables, "soccer/usa.1");
  const layout = layoutPostseasonRounds(completed.rounds, "soccer/usa.1");
  assert.deepEqual(
    layout.rounds.map((r) => [r.name, r.matchups.length]),
    [
      ["Wild Card", 2],
      ["Round One", 8],
      ["Conference Semifinals", 4],
      ["Conference Finals", 2],
      ["MLS Cup", 1],
    ],
  );
  const topSeed = completed.rounds
    .find((r) => r.name === "East Round One")!
    .matchups.find((m) => m.id === "projected-east-r1-1")!;
  assert.deepEqual(
    topSeed.teams.map((t) => t.id),
    ["400", "winner:e-wc"],
  );
  assert.equal(real.rounds[2].matchups.length, 3);
});
