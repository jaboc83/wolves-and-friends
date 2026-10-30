import assert from "node:assert/strict";
import test from "node:test";
import { usmntVerifiedGames } from "../lib/games/usmnt-schedule.ts";

test("verified USMNT fall fixtures retain official dates and competition labels", () => {
  const games = usmntVerifiedGames("2026-10-30T14:00:00Z");
  assert.deepEqual(
    games.map((game) => [
      game.date,
      game.competitors.map((team) => team.name).join(" / "),
      game.league,
    ]),
    [
      [
        "2026-11-14T16:30:00-05:00",
        "United States / Haiti",
        "Concacaf Nations League",
      ],
      [
        "2026-11-17T19:00:00-05:00",
        "Haiti / United States",
        "Concacaf Nations League",
      ],
      [
        "2026-12-13T15:30:00-05:00",
        "Jamaica / United States",
        "International Friendly",
      ],
    ],
  );
  assert.ok(
    games.every(
      (game) =>
        game.url === "https://www.ussoccer.com/schedule-tickets/usmnt" &&
        game.sourceChecked === "2026-10-30T14:00:00Z" &&
        game.sourceName === "Official U.S. Soccer schedule",
    ),
  );
  assert.deepEqual(
    games.slice(0, 2).map((game) => game.competitionNote),
    ["Quarterfinal · First leg", "Quarterfinal · Second leg"],
  );
});
