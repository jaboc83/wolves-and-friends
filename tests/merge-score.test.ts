import assert from "node:assert/strict";
import test from "node:test";
import { mergeScoreUpdate, mergeScoreUpdates } from "../lib/games/merge-score.ts";
import type { Game } from "../lib/feeds/feed-types";

const checked = "2026-10-28T21:00:00Z";
function game(state: string, id = "wolves-official-80"): Game {
  return {
    id, team: "wolves", name: "Minnesota Timberwolves at Chicago Bulls",
    date: "2026-10-28T19:30:00Z", state,
    status: state === "post" ? "Final" : state === "in" ? "Q4 03:19" : "Scheduled",
    league: "NBA", venue: "United Center", broadcast: "", url: "https://example.com/game",
    sourceChecked: checked,
    competitors: [
      { name: "Chicago Bulls", homeAway: "home", score: state === "pre" ? "" : "64", winner: false },
      { name: "Minnesota Timberwolves", homeAway: "away", score: state === "pre" ? "" : "85", winner: state === "post" },
    ],
  };
}

for (const state of ["in", "post"]) {
  test(`schedule and scoreboard refreshes cannot erase a known ${state} score`, () => {
    const known = game(state);
    const fixture = { ...game("pre", "wolves-80"), venue: "Updated venue" };
    const previous = JSON.stringify(known);
    const [schedule] = mergeScoreUpdates([known], [fixture]);
    // The next score poll can carry a separate ID for the same event.
    const result = mergeScoreUpdate(schedule, game("pre", "score-poll-80"));
    assert.equal(result.state, state);
    assert.equal(result.status, known.status);
    assert.deepEqual(result.competitors.map(p => p.score), ["64", "85"]);
    assert.equal(schedule.venue, "Updated venue");
    assert.equal(result.sourceChecked, checked);
    assert.equal(JSON.stringify(known), previous, "cache remains immutable");
  });
}

test("later live scores and final score corrections still replace old scores", () => {
  const final = game("post");
  final.competitors[0].score = "70";
  assert.equal(mergeScoreUpdate(game("in"), final), final);
  assert.equal(mergeScoreUpdate(game("post"), final), final);
});

test("scores stay attached to home/away sides when provider ordering differs", () => {
  const fixture = game("pre"); fixture.competitors.reverse();
  assert.deepEqual(mergeScoreUpdate(game("post"), fixture).competitors.map(p => p.score), ["85", "64"]);
});

test("different games, competitions and explicit postponements are not treated as stale", () => {
  const previous = game("post");
  for (const fresh of [
    { ...game("pre", "different"), date: "2026-10-30T19:30:00Z" },
    { ...game("pre", "cup"), league: "NBA Cup" },
    { ...game("pre"), status: "Postponed" },
    { ...game("pre"), status: "Cancelled" },
  ]) assert.equal(mergeScoreUpdate(previous, fresh), fresh);
});

test("a genuine future scheduled game stays scoreless", () => {
  const fixture = game("pre");
  assert.deepEqual(mergeScoreUpdates([], [fixture]), [fixture]);
  assert.equal(mergeScoreUpdate(fixture, { ...fixture }).state, "pre");
});

test("a result payload remains final after a scheduled-only response", () => {
  const final = game("post");
  const refreshed = mergeScoreUpdates([final], [game("pre")])[0];
  assert.equal(refreshed.state, "post");
  assert.equal(refreshed.competitors[1].score, "85");
});

test("different opponents or nearby separate fixtures never inherit a score", () => {
  const previous = game("post");
  const otherOpponent = game("pre", "other-opponent");
  otherOpponent.competitors[0].name = "Boston Celtics";
  assert.equal(mergeScoreUpdate(previous, otherOpponent), otherOpponent);
  const later = { ...game("pre", "separate-event"), date: "2026-10-28T20:30:00Z" };
  assert.equal(mergeScoreUpdate(previous, later), later);
});
