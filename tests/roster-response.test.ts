import assert from "node:assert/strict";
import test from "node:test";
import {
  isRosterResponse,
  rosterEntries,
} from "../lib/team-info/roster-response.ts";

const person = (id: number, abbreviation: string) => ({
  id: String(id),
  position: { displayName: abbreviation, abbreviation },
});

// Shapes observed from ESPN's site API roster endpoint per league.
const fixtures = {
  nba: {
    team: { id: "16" },
    season: { year: 2027 },
    athletes: [person(1, "G"), person(2, "F")],
  },
  wnba: {
    team: { id: "8" },
    season: { year: 2026 },
    athletes: [person(3, "G")],
  },
  nhl: {
    team: { id: "30" },
    season: { year: 2027 },
    athletes: [
      { position: "Centers", items: [person(4, "C"), person(5, "C")] },
      { position: "Goalies", items: [person(6, "G")] },
    ],
  },
  soccer: {
    team: { id: "10" },
    athletes: [person(7, "M"), person(8, "D")],
  },
};

for (const [league, fixture] of Object.entries(fixtures)) {
  test(`${league} roster shape is accepted`, () => {
    assert.equal(isRosterResponse(fixture), true);
    const entries = rosterEntries(fixture, league, "x", 2026);
    assert.ok(entries.length > 0);
    assert.ok(entries.every((entry) => /^\d+$/.test(entry.id)));
  });
}

test("NHL grouped rows are flattened and keep player positions", () => {
  const entries = rosterEntries(fixtures.nhl, "hockey/nhl", "min");
  assert.deepEqual(
    entries.map((entry) => [entry.key, entry.position, entry.teamId]),
    [
      ["hockey/nhl:4", "C", "30"],
      ["hockey/nhl:5", "C", "30"],
      ["hockey/nhl:6", "G", "30"],
    ],
  );
});

test("missing team and season fall back to the provided values", () => {
  const [entry] = rosterEntries(
    { athletes: [{ id: 9 }] },
    "soccer/usa.1",
    "abc",
    2030,
  );
  assert.equal(entry.teamId, "abc");
  assert.equal(entry.year, 2030);
});

test("malformed responses are rejected", () => {
  assert.equal(isRosterResponse(null), false);
  assert.equal(isRosterResponse({ athletes: "nope" }), false);
  assert.equal(isRosterResponse({ athletes: [{ id: {} }] }), false);
  assert.equal(isRosterResponse({ team: { id: {} } }), false);
});
