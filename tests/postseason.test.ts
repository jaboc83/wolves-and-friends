import assert from "node:assert/strict";
import test from "node:test";
import { fetchPostseason, parsePostseason } from "../lib/games/postseason.ts";
import { layoutPostseasonRounds } from "../lib/games/postseason-layout.ts";

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
