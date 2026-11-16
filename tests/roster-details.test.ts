import assert from "node:assert/strict";
import test from "node:test";
import { rosterDetails } from "../lib/team-info/roster-details.ts";

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
