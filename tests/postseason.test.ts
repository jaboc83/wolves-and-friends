import assert from "node:assert/strict";
import test from "node:test";
import { fetchPostseason } from "../lib/games/postseason.ts";

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
