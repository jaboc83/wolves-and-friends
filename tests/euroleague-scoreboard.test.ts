import assert from "node:assert/strict";
import test from "node:test";
import { parseEuroLeagueGames } from "../lib/feeds/euroleague-scoreboard.ts";

const checked = "2026-10-28T21:00:00.000Z";

function feed(status: string, date = "2026-10-28T19:30:00.000Z") {
  return {
    status: "success",
    data: [
      {
        identifier: "E2026_80",
        date,
        status,
        quarter: "4",
        remainingTime: "03:19",
        home: { code: "VIR", name: "Virtus Bologna", score: 64 },
        away: { code: "ZAL", name: "Zalgiris Kaunas", score: 85 },
      },
    ],
  };
}

test("maps a live Žalgiris game and its current score", () => {
  const [game] = parseEuroLeagueGames(feed("live"), checked);

  assert.equal(game.team, "zalgiris");
  assert.equal(game.name, "Zalgiris Kaunas at Virtus Bologna");
  assert.equal(game.state, "in");
  assert.equal(game.status, "Q4 03:19");
  assert.deepEqual(
    game.competitors.map(({ score }) => score),
    ["64", "85"],
  );
});

test("marks completed games and the winner", () => {
  const [game] = parseEuroLeagueGames(feed("finished"), checked);

  assert.equal(game.state, "post");
  assert.deepEqual(
    game.competitors.map(({ winner }) => winner),
    [false, true],
  );
});

test("leaves scheduled scores blank and ignores distant fixtures", () => {
  assert.equal(
    parseEuroLeagueGames(feed("scheduled"), checked)[0].competitors[0].score,
    "",
  );
  assert.deepEqual(
    parseEuroLeagueGames(feed("live", "2026-11-02T19:30:00.000Z"), checked),
    [],
  );
});