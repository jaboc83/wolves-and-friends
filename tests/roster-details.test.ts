import assert from "node:assert/strict";
import test from "node:test";
import {
  highestPaidPlayers,
  rosterDetails,
} from "../lib/team-info/roster-details.ts";

test("highest paid players are ranked across position groups without reordering them", () => {
  const groups = [
    { players: [{ annualSalary: 10 }, { annualSalary: 80 }, { annualSalary: 30 }] },
    { players: [{ annualSalary: 90 }, { annualSalary: 20 }, { annualSalary: 70 }] },
    { players: [{ annualSalary: 60 }, { annualSalary: 40 }] },
  ];
  const players = groups.flatMap((group) => group.players);
  const original = [...players];

  assert.deepEqual(
    [...highestPaidPlayers(players)].map((player) => player.annualSalary),
    [90, 80, 70, 60, 40],
  );
  assert.deepEqual(players, original);
});

test("highest paid selection ignores missing salaries and caps tied players at five", () => {
  const paid = Array.from({ length: 6 }, () => ({ annualSalary: 100 }));
  const players = [
    {},
    { annualSalary: 0 },
    { annualSalary: -10 },
    { annualSalary: Number.NaN },
    ...paid,
  ];

  const selected = highestPaidPlayers(players);
  assert.equal(selected.size, 5);
  assert.equal(selected.has(paid[5]), false);
  assert.ok(paid.slice(0, 5).every((player) => selected.has(player)));
  assert.deepEqual([...highestPaidPlayers([{}, paid[0]])], [paid[0]]);
  assert.equal(highestPaidPlayers([]).size, 0);
});

test("roster details use the salary for the current calendar year", () => {
  const details = rosterDetails(
    {
      dateOfBirth: "1997-08-07T07:00Z",
      contracts: [
        { salary: 3_000_000, season: { year: 2025 } },
        { salary: 13_000_000, season: { year: 2026 } },
      ],
      contract: {
        salary: 13_000_000,
        season: { year: 2026 },
      },
    },
    "football/nfl",
    2027,
    "2026-11-16T18:00:00Z",
    "vikings",
  );

  assert.deepEqual(details, { age: 29, annualSalary: 13_000_000 });
});

test("roster details omit salary when the current year has none", () => {
  const details = rosterDetails(
    {
      age: 29,
      contracts: [{ salary: 3_000_000, season: { year: 2025 } }],
      contract: {
        salary: 3_000_000,
        season: { year: 2025 },
      },
    },
    "football/nfl",
    2026,
    "2026-11-16T18:00:00Z",
    "vikings",
  );

  assert.deepEqual(details, { age: 29 });
});

test("NBA roster details do not use ESPN contract values for salary", () => {
  const details = rosterDetails(
    {
      age: 24,
      contracts: [{ salary: 24_300_000, season: { year: 2026 } }],
      contract: {
        salary: 24_300_000,
        season: { year: 2026 },
      },
    },
    "basketball/nba",
    2027,
    "2026-11-16T18:00:00Z",
    "wolves",
  );

  assert.deepEqual(details, { age: 24 });
});
