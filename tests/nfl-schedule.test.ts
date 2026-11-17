import assert from "node:assert/strict";
import test from "node:test";
import { parseNflFixtures } from "../lib/feeds/nfl-schedule.ts";

test("NFL fixtures keep only the team's games with scores and ESPN ids", () => {
  const games = parseNflFixtures(
    [
      {
        MatchNumber: 13,
        DateUtc: "2026-09-13 20:25:00Z",
        Location: "U.S. Bank Stadium",
        HomeTeam: "Minnesota Vikings",
        AwayTeam: "Green Bay Packers",
        HomeTeamScore: 39,
        AwayTeamScore: 22,
      },
      {
        MatchNumber: 20,
        DateUtc: "2026-12-29 00:00:00Z",
        HomeTeam: "Chicago Bears",
        AwayTeam: "Minnesota Vikings",
        HomeTeamScore: null,
        AwayTeamScore: null,
      },
      {
        MatchNumber: 21,
        DateUtc: "2026-09-13 17:00:00Z",
        HomeTeam: "Detroit Lions",
        AwayTeam: "Chicago Bears",
      },
    ],
    "vikings",
    "Minnesota Vikings",
    "2026-11-17T00:00:00Z",
  );
  assert.equal(games.length, 2);
  assert.equal(games[0].state, "post");
  assert.deepEqual(
    games[0].competitors.map((c) => [c.name, c.teamId, c.score, c.winner]),
    [
      ["Packers", "9", "22", false],
      ["Vikings", "16", "39", true],
    ],
  );
  assert.equal(games[1].state, "pre");
  assert.equal(games[1].competitors[0].score, "");
});
